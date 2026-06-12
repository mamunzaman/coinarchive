<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_submit_coin')) {
    function caes_submit_coin(WP_REST_Request $request) {
        $title             = sanitize_text_field($request->get_param('title'));
        $country           = sanitize_text_field($request->get_param('country'));
        $denomination      = sanitize_text_field($request->get_param('denomination'));
        $coin_type         = sanitize_text_field($request->get_param('coin_type') ?? '');
        $short_description = sanitize_textarea_field($request->get_param('short_description') ?? '');
        $year_result       = caes_validate_coin_year($request->get_param('year'));

        if (is_wp_error($year_result)) {
            return $year_result;
        }

        $year = $year_result;

        if (empty($title) || empty($country) || empty($denomination) || empty($coin_type) || empty($short_description)) {
            return new WP_Error(
                'rest_missing_fields',
                'Required fields: title, country, year, denomination, coin_type, short_description.',
                array('status' => 400)
            );
        }

        if (caes_submission_image_file_present('obverse_image')) {
            $obverse_check = caes_validate_image_upload_file($_FILES['obverse_image'], 'obverse_image');

            if (is_wp_error($obverse_check)) {
                return $obverse_check;
            }
        }

        if (caes_submission_image_file_present('reverse_image')) {
            $reverse_check = caes_validate_image_upload_file($_FILES['reverse_image'], 'reverse_image');

            if (is_wp_error($reverse_check)) {
                return $reverse_check;
            }
        }

        $submit_params = caes_get_request_merged_params($request);
        $coin_series = caes_normalize_coin_series_request_value(
            array_key_exists('coin_series', $submit_params) ? $submit_params['coin_series'] : ''
        );

        if (is_wp_error($coin_series)) {
            return $coin_series;
        }

        $taxonomy_result = caes_validate_submission_taxonomies($country, $denomination, $coin_type, $coin_series);

        if (is_wp_error($taxonomy_result)) {
            return $taxonomy_result;
        }

        $country      = $taxonomy_result['country']['name'];
        $denomination = $taxonomy_result['denomination']['name'];
        $coin_type    = $taxonomy_result['coin_type']['name'];

        $optional_acf_check = caes_validate_optional_acf_fields_from_request($request);

        if (is_wp_error($optional_acf_check)) {
            return $optional_acf_check;
        }
        $released_date = array_key_exists('released_date', $submit_params)
            ? $submit_params['released_date']
            : '';
        $content_language = caes_normalize_content_language($submit_params['content_language'] ?? '');

        $duplicate_check = caes_validate_coin_duplicate_codes(
            $submit_params['unique_code'] ?? '',
            $submit_params['coin_code'] ?? '',
            0
        );

        if (is_wp_error($duplicate_check)) {
            return $duplicate_check;
        }

        $post_id                = 0;
        $created_attachment_ids = array();

        $post_id = wp_insert_post(array(
            'post_type'   => 'coin',
            'post_status' => 'pending',
            'post_title'  => $title,
        ));

        if (is_wp_error($post_id) || empty($post_id)) {
            return new WP_Error(
                'rest_post_create_failed',
                'Failed to create coin submission.',
                array('status' => 500)
            );
        }

        $contributor = $request->get_param('_caes_contributor');

        if (!empty($contributor)) {
            update_post_meta($post_id, '_caes_contributor_id', (int) $contributor->id);
            update_post_meta($post_id, '_caes_contributor_email', sanitize_email($contributor->email));
            update_post_meta($post_id, '_caes_submission_auth_type', 'contributor_token');
        } else {
            update_post_meta($post_id, '_caes_submission_auth_type', 'admin_api_key');
        }

        update_post_meta($post_id, '_caes_country', $country);
        update_post_meta($post_id, '_caes_year', $year);
        update_post_meta($post_id, '_caes_denomination', $denomination);
        update_post_meta($post_id, '_caes_submission_source', 'external_api');
        update_post_meta($post_id, '_caes_short_description', $short_description);
        caes_save_submission_content_language($post_id, $content_language);

        $taxonomy_assign = caes_assign_submission_taxonomies($post_id, $taxonomy_result);

        if (is_wp_error($taxonomy_assign)) {
            return caes_submission_create_fail($post_id, $created_attachment_ids, $taxonomy_assign);
        }

        caes_save_coin_acf_fields($post_id, array_merge(
            caes_get_submission_acf_defaults(),
            caes_get_supported_acf_fields_from_request($request),
            caes_get_status_fields_from_request($request, $contributor),
            array(
                'coin_year'              => $year,
                'coin_short_description' => $short_description,
            )
        ));

        caes_save_coin_country_code_from_country($post_id, $country);

        $code_result = caes_save_generated_coin_code(
            $post_id,
            $country,
            $year,
            $denomination,
            $coin_type,
            caes_get_coin_released_date_for_codes($post_id),
            array(
                'force_new_suffix' => true,
            )
        );

        if (is_wp_error($code_result)) {
            return caes_submission_create_fail($post_id, $created_attachment_ids, $code_result);
        }

        if (is_array($code_result)) {
            $generated_duplicate_check = caes_validate_coin_duplicate_codes(
                $code_result['unique_code'] ?? ($code_result['coin_code'] ?? ''),
                $code_result['coin_code'] ?? '',
                $post_id
            );

            if (is_wp_error($generated_duplicate_check)) {
                return caes_submission_create_fail($post_id, $created_attachment_ids, $generated_duplicate_check);
            }
        }

        caes_save_mint_fields($post_id, caes_get_mint_fields_from_request($request));

        $obverse_id = caes_handle_image_upload('obverse_image', $post_id);

        if (is_wp_error($obverse_id)) {
            return caes_submission_create_fail($post_id, $created_attachment_ids, $obverse_id);
        }

        if (!empty($obverse_id)) {
            $created_attachment_ids[] = absint($obverse_id);
            caes_save_coin_obverse_image_id($post_id, $obverse_id);
        }

        $reverse_id = caes_handle_image_upload('reverse_image', $post_id);

        if (is_wp_error($reverse_id)) {
            return caes_submission_create_fail($post_id, $created_attachment_ids, $reverse_id);
        }

        if (!empty($reverse_id)) {
            $created_attachment_ids[] = absint($reverse_id);
            caes_save_coin_reverse_image_id($post_id, $reverse_id);
        }

        $defaults_applied = caes_apply_default_coin_images_if_missing($post_id);

        $image_ids_check = caes_validate_coin_obverse_reverse_ids($post_id);

        if (is_wp_error($image_ids_check)) {
            return caes_submission_create_fail($post_id, $created_attachment_ids, $image_ids_check);
        }

        $gallery_ids = caes_handle_gallery_uploads('gallery_images', $post_id);

        if (is_wp_error($gallery_ids)) {
            return caes_submission_create_fail($post_id, $created_attachment_ids, $gallery_ids);
        }

        if (!empty($gallery_ids)) {
            $created_attachment_ids = array_merge($created_attachment_ids, caes_normalize_gallery_ids($gallery_ids));
        }

        if (!empty($gallery_ids)) {
            caes_stamp_attachment_contributors($gallery_ids, $contributor);
            caes_save_coin_gallery_ids($post_id, $gallery_ids);

            foreach ($gallery_ids as $added_id) {
                caes_log_submission_event(
                    $post_id,
                    'gallery_image_added',
                    'Gallery image added',
                    sprintf('Gallery image %d was added to the submission.', $added_id),
                    array('attachment_id' => (int) $added_id),
                    $contributor
                );
            }

            caes_log_submission_event(
                $post_id,
                'gallery_updated',
                'Gallery updated',
                'Coin gallery images were updated.',
                array(
                    'gallery_count' => count($gallery_ids),
                    'gallery_ids'   => $gallery_ids,
                ),
                $contributor
            );
        }

        caes_sync_featured_image_from_obverse(
            $post_id,
            !empty($obverse_id) || !empty($defaults_applied['obverse'])
        );

        caes_log_submission_event(
            $post_id,
            'created',
            'Submission created',
            'A new coin submission was created.',
            array('post_status' => 'pending'),
            $contributor
        );

        caes_log_submission_event(
            $post_id,
            'submitted',
            'Submission submitted',
            'Coin submission was submitted for review.',
            array('post_status' => 'pending'),
            $contributor
        );

        return new WP_REST_Response(array(
            'success'   => true,
            'message'   => 'Coin submission created successfully.',
            'post_id'   => $post_id,
            'status'    => 'pending',
            'edit_link' => get_edit_post_link($post_id, ''),
            'meta'      => array(
                'country'           => $country,
                'year'              => $year,
                'denomination'      => $denomination,
                'content_language'  => $content_language,
                'content_language_label' => caes_get_content_language_label($content_language),
                'submission_source' => 'external_api',
            ),
            'taxonomies' => array(
                'coin_country' => $country,
                'coin_value'   => $denomination,
                'coin_type'    => $coin_type,
                'coin_series'  => (is_array($taxonomy_result['coin_series'] ?? null) && !empty($taxonomy_result['coin_series']['name']))
                    ? $taxonomy_result['coin_series']['name']
                    : '',
            ),
            'acf' => caes_get_coin_acf_detail($post_id),
            'images' => array(
                'obverse_image_id' => $obverse_id ?: null,
                'reverse_image_id' => $reverse_id ?: null,
                'gallery'          => caes_format_submission_gallery_images($post_id),
            ),
            'submitted_by' => !empty($contributor) ? array(
                'auth_type'      => 'contributor_token',
                'contributor_id'   => (int) $contributor->id,
                'email'          => $contributor->email,
            ) : array(
                'auth_type'      => 'admin_api_key',
                'contributor_id' => null,
                'email'          => null,
            ),
        ), 200);
    }
}

if (!function_exists('caes_normalize_taxonomy_options_language')) {
    function caes_normalize_taxonomy_options_language($language) {
        $language = strtolower(sanitize_key((string) $language));

        return in_array($language, array('de', 'en'), true) ? $language : 'de';
    }
}

if (!function_exists('caes_get_country_code_from_term_id')) {
    function caes_get_country_code_from_term_id($term_id) {
        $term_id = absint($term_id);

        if ($term_id <= 0) {
            return '';
        }

        foreach (array('country_code', 'coin_country_code', 'code') as $meta_key) {
            $code = '';

            if (function_exists('get_field')) {
                $acf_code = get_field($meta_key, 'coin_country_' . $term_id);

                if ($acf_code !== '' && $acf_code !== null && $acf_code !== false) {
                    $code = $acf_code;
                }
            }

            if ($code === '') {
                $code = get_term_meta($term_id, $meta_key, true);
            }

            if ($code !== '' && $code !== null && $code !== false) {
                return strtoupper(sanitize_text_field((string) $code));
            }
        }

        return '';
    }
}

if (!function_exists('caes_get_country_code_for_taxonomy_option')) {
    function caes_get_country_code_for_taxonomy_option($term, $language) {
        if (empty($term) || $term->taxonomy !== 'coin_country') {
            return '';
        }

        $code = caes_get_country_code_from_term_id($term->term_id);

        if ($code !== '' || !function_exists('pll_get_term')) {
            return $code;
        }

        foreach (array($language, 'de', 'en') as $translation_language) {
            $translated_term_id = absint(pll_get_term($term->term_id, $translation_language));

            if ($translated_term_id <= 0 || $translated_term_id === (int) $term->term_id) {
                continue;
            }

            $code = caes_get_country_code_from_term_id($translated_term_id);

            if ($code !== '') {
                return $code;
            }
        }

        return '';
    }
}

if (!function_exists('caes_format_taxonomy_option')) {
    function caes_format_taxonomy_option($term, $language) {
        $option = array(
            'id'       => (int) $term->term_id,
            'name'     => $term->name,
            'slug'     => $term->slug,
            'taxonomy' => $term->taxonomy,
        );

        $country_code = caes_get_country_code_for_taxonomy_option($term, $language);

        if ($country_code !== '') {
            $option['country_code'] = $country_code;
        }

        return $option;
    }
}

if (!function_exists('caes_get_taxonomy_options')) {
    function caes_get_taxonomy_options($taxonomy, $language = 'de') {
        $language = caes_normalize_taxonomy_options_language($language);
        $terms = get_terms(array(
            'taxonomy'   => $taxonomy,
            'hide_empty' => false,
            'orderby'    => 'name',
            'order'      => 'ASC',
        ));

        if (is_wp_error($terms) || empty($terms)) {
            return array();
        }

        $options = array();
        $seen    = array();

        foreach ($terms as $term) {
            if (function_exists('pll_get_term_language')) {
                $term_language = pll_get_term_language($term->term_id);

                if ($term_language !== false && $term_language !== '' && $term_language !== $language) {
                    continue;
                }
            }

            $dedupe_key = $taxonomy . ':' . sanitize_title($term->name);

            if (isset($seen[$dedupe_key])) {
                continue;
            }

            $seen[$dedupe_key] = true;
            $options[]         = caes_format_taxonomy_option($term, $language);
        }

        return $options;
    }
}

if (!function_exists('caes_get_form_options')) {
    function caes_get_form_options(WP_REST_Request $request) {
        $language = caes_normalize_taxonomy_options_language(
            $request->get_param('lang') ?: $request->get_param('content_language')
        );

        return new WP_REST_Response(array(
            'success'        => true,
            'options'        => array(
                'countries' => caes_get_taxonomy_options('coin_country', $language),
                'values'    => caes_get_taxonomy_options('coin_value', $language),
                'types'     => caes_get_taxonomy_options('coin_type', $language),
                'series'    => caes_get_taxonomy_options('coin_series', $language),
            ),
            'default_images' => caes_get_default_images_for_api(),
        ), 200);
    }
}

if (!function_exists('caes_get_submission_revision_notes')) {
    function caes_get_submission_revision_notes($post_id) {
        $notes = get_post_meta(absint($post_id), '_caes_revision_notes', true);

        if (!is_string($notes)) {
            return '';
        }

        return sanitize_textarea_field(trim($notes));
    }
}

if (!function_exists('caes_get_submission_content_language')) {
    function caes_get_submission_content_language($post_id) {
        return caes_normalize_content_language(get_post_meta(absint($post_id), '_caes_content_language', true));
    }
}

if (!function_exists('caes_get_opposite_content_language')) {
    function caes_get_opposite_content_language($lang) {
        return caes_normalize_content_language($lang) === 'en' ? 'de' : 'en';
    }
}

if (!function_exists('caes_get_submission_translation_status')) {
    function caes_get_submission_translation_status($post_id) {
        $post_id          = absint($post_id);
        $content_language = caes_get_submission_content_language($post_id);
        $target_language  = caes_get_opposite_content_language($content_language);
        $target_label     = $target_language === 'de' ? 'German' : 'English';

        $status = array(
            'missing_translation_language' => $target_language,
            'missing_translation_language_label' => $target_label,
            'translation_status'           => 'polylang_inactive',
            'translation_status_label'     => 'Translation status unavailable',
            'translation_post_id'          => null,
        );

        if (!function_exists('pll_get_post')) {
            return $status;
        }

        $translated_post_id = absint(pll_get_post($post_id, $target_language));

        if ($translated_post_id > 0 && $translated_post_id !== $post_id) {
            $status['missing_translation_language'] = '';
            $status['missing_translation_language_label'] = '';
            $status['translation_status']           = 'available';
            $status['translation_status_label']     = sprintf('%s translation: Available', $target_label);
            $status['translation_post_id']          = $translated_post_id;

            return $status;
        }

        $post = get_post($post_id);

        if (empty($post) || $post->post_status !== 'publish') {
            $status['translation_status']       = 'translation_link_pending';
            $status['translation_status_label'] = sprintf('%s translation: Missing (translation link pending until published)', $target_label);

            return $status;
        }

        $status['translation_status']       = 'missing';
        $status['translation_status_label'] = sprintf('%s translation: Missing', $target_label);

        return $status;
    }
}

if (!function_exists('caes_apply_submission_content_language_fields')) {
    function caes_apply_submission_content_language_fields(&$submission, $post_id) {
        if (!is_array($submission)) {
            return;
        }

        $content_language = caes_get_submission_content_language($post_id);
        $translation      = caes_get_submission_translation_status($post_id);

        $submission['content_language']       = $content_language;
        $submission['content_language_label'] = caes_get_content_language_label($content_language);
        $submission['content_language_badge'] = strtoupper($content_language);
        $submission['content_language_notice'] = sprintf(
            'This submission should be reviewed and published as %s content.',
            $content_language === 'en' ? 'English' : 'German'
        );
        $submission['missing_translation_language'] = $translation['missing_translation_language'];
        $submission['missing_translation_language_label'] = $translation['missing_translation_language_label'];
        $submission['translation_status']           = $translation['translation_status'];
        $submission['translation_status_label']     = $translation['translation_status_label'];
        $submission['translation_post_id']          = $translation['translation_post_id'];
    }
}

if (!function_exists('caes_apply_submission_review_fields')) {
    function caes_apply_submission_review_fields(&$submission, $post_id) {
        if (!is_array($submission)) {
            return;
        }

        caes_apply_submission_content_language_fields($submission, $post_id);

        $revision_notes = caes_get_submission_revision_notes($post_id);

        $submission['revision_notes']     = $revision_notes;
        $submission['has_revision_notes'] = $revision_notes !== '';
    }
}

if (!function_exists('caes_get_my_submissions')) {
    function caes_get_my_submissions(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');

        if (empty($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing contributor token.',
                array('status' => 401)
            );
        }

        $posts = get_posts(array(
            'post_type'      => 'coin',
            'post_status'    => 'any',
            'posts_per_page' => -1,
            'orderby'        => 'date',
            'order'          => 'DESC',
            'meta_key'       => '_caes_contributor_id',
            'meta_value'     => (int) $contributor->id,
        ));

        $submissions = array();

        foreach ($posts as $post) {
            $post_id     = (int) $post->ID;
            $list_images = caes_get_submission_list_images($post_id);

            $item = array(
                'id'            => $post_id,
                'title'         => get_the_title($post),
                'status'        => $post->post_status,
                'date'          => get_the_date('Y-m-d H:i:s', $post),
                'edit_link'     => get_edit_post_link($post->ID, ''),
                'preview_image' => $list_images['preview_image'],
                'images'        => $list_images['images'],
            );

            caes_apply_submission_review_fields($item, $post_id);

            $submissions[] = $item;
        }

        return new WP_REST_Response(array(
            'success'     => true,
            'submissions' => $submissions,
        ), 200);
    }
}

if (!function_exists('caes_format_submission_gallery_images')) {
    function caes_format_submission_gallery_images($post_id) {
        $gallery = array();

        foreach (caes_get_coin_gallery_ids($post_id) as $attachment_id) {
            $image = caes_format_submission_image($attachment_id);

            if (!empty($image)) {
                $gallery[] = $image;
            }
        }

        return $gallery;
    }
}

if (!function_exists('caes_format_submission_image')) {
    function caes_format_submission_image($attachment_id) {
        $attachment_id = absint($attachment_id);

        if (empty($attachment_id)) {
            return null;
        }

        $url = wp_get_attachment_url($attachment_id);

        if (empty($url)) {
            return null;
        }

        return array(
            'id'  => $attachment_id,
            'url' => $url,
        );
    }
}

if (!function_exists('caes_get_submission_list_image_url')) {
    function caes_get_submission_list_image_url($attachment_id) {
        $attachment_id = absint($attachment_id);

        if (empty($attachment_id)) {
            return null;
        }

        foreach (array('medium', 'thumbnail') as $size) {
            $src = wp_get_attachment_image_src($attachment_id, $size);

            if (!empty($src[0])) {
                return $src[0];
            }
        }

        return wp_get_attachment_url($attachment_id) ?: null;
    }
}

if (!function_exists('caes_format_submission_list_image')) {
    function caes_format_submission_list_image($attachment_id) {
        $attachment_id = absint($attachment_id);

        if (empty($attachment_id)) {
            return null;
        }

        $url = caes_get_submission_list_image_url($attachment_id);

        if (empty($url)) {
            return null;
        }

        return array(
            'id'  => $attachment_id,
            'url' => $url,
        );
    }
}

if (!function_exists('caes_get_submission_obverse_reverse_ids')) {
    function caes_get_submission_obverse_reverse_ids($post_id) {
        $post_id = absint($post_id);

        return array(
            'obverse_id' => caes_get_coin_obverse_attachment_id($post_id),
            'reverse_id' => caes_get_coin_reverse_attachment_id($post_id),
        );
    }
}

if (!function_exists('caes_format_submission_gallery_images_for_list')) {
    function caes_format_submission_gallery_images_for_list($post_id, $limit = 3) {
        $gallery = array();
        $limit   = max(1, absint($limit));

        foreach (caes_get_coin_gallery_ids($post_id) as $attachment_id) {
            if (count($gallery) >= $limit) {
                break;
            }

            $image = caes_format_submission_list_image($attachment_id);

            if (!empty($image)) {
                $gallery[] = $image;
            }
        }

        return $gallery;
    }
}

if (!function_exists('caes_get_submission_preview_image')) {
    function caes_get_submission_preview_image($obverse, $reverse, $gallery) {
        if (!empty($obverse)) {
            return $obverse;
        }

        if (!empty($reverse)) {
            return $reverse;
        }

        if (!empty($gallery) && !empty($gallery[0])) {
            return $gallery[0];
        }

        return null;
    }
}

if (!function_exists('caes_get_submission_list_images')) {
    function caes_get_submission_list_images($post_id) {
        $ids      = caes_get_submission_obverse_reverse_ids($post_id);
        $obverse  = caes_format_submission_list_image($ids['obverse_id']);
        $reverse  = caes_format_submission_list_image($ids['reverse_id']);
        $gallery  = caes_format_submission_gallery_images_for_list($post_id, 3);

        return array(
            'preview_image' => caes_get_submission_preview_image($obverse, $reverse, $gallery),
            'images'        => array(
                'obverse' => $obverse,
                'reverse' => $reverse,
                'gallery' => $gallery,
            ),
        );
    }
}

if (!function_exists('caes_get_my_submission')) {
    function caes_get_my_submission(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');
        $post_id     = absint($request->get_param('id'));

        if (empty($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing contributor token.',
                array('status' => 401)
            );
        }

        $post = get_post($post_id);

        if (empty($post) || $post->post_type !== 'coin') {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        if (!caes_can_view_submission_logs($contributor, $post_id)) {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        $country_terms = wp_get_post_terms($post_id, 'coin_country', array('fields' => 'names'));
        $value_terms   = wp_get_post_terms($post_id, 'coin_value', array('fields' => 'names'));
        $type_terms    = wp_get_post_terms($post_id, 'coin_type', array('fields' => 'names'));
        $series_terms  = wp_get_post_terms($post_id, 'coin_series', array('fields' => 'names'));

        $acf_detail = caes_get_coin_acf_detail($post_id);
        $image_ids  = caes_get_submission_obverse_reverse_ids($post_id);
        $submission = array(
            'id'                => (int) $post->ID,
            'title'             => get_the_title($post),
            'status'            => $post->post_status,
            'date'              => get_the_date('Y-m-d H:i:s', $post),
            'country'           => !empty($country_terms) ? $country_terms[0] : get_post_meta($post_id, '_caes_country', true),
            'denomination'      => !empty($value_terms) ? $value_terms[0] : get_post_meta($post_id, '_caes_denomination', true),
            'coin_type'         => !empty($type_terms) ? $type_terms[0] : '',
            'coin_series'       => (!is_wp_error($series_terms) && !empty($series_terms))
                ? caes_format_coin_series_name_for_api($series_terms[0], caes_get_submission_content_language($post_id))
                : '',
            'year'              => $acf_detail['coin_year'],
            'short_description' => $acf_detail['coin_short_description'],
            'images'            => array(
                'obverse' => caes_format_submission_image($image_ids['obverse_id']),
                'reverse' => caes_format_submission_image($image_ids['reverse_id']),
                'gallery' => caes_format_submission_gallery_images($post_id),
            ),
        );

        caes_apply_submission_review_fields($submission, $post_id);

        return new WP_REST_Response(array(
            'success'       => true,
            'submission'    => $submission,
            'acf'           => $acf_detail,
            'activity_logs' => caes_get_submission_activity_logs_payload($post_id),
        ), 200);
    }
}

if (!function_exists('caes_get_my_submission_activity')) {
    function caes_get_my_submission_activity(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');
        $post_id     = absint($request->get_param('id'));

        if (empty($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing contributor token.',
                array('status' => 401)
            );
        }

        if (!caes_can_view_submission_logs($contributor, $post_id)) {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        return new WP_REST_Response(array(
            'success'       => true,
            'post_id'       => $post_id,
            'total'         => caes_count_submission_logs($post_id),
            'activity_logs' => caes_get_all_submission_logs($post_id),
        ), 200);
    }
}

if (!function_exists('caes_update_my_submission')) {
    function caes_update_my_submission(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');
        $post_id     = absint($request->get_param('id'));

        if (empty($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing contributor token.',
                array('status' => 401)
            );
        }

        $post = get_post($post_id);

        if (empty($post) || $post->post_type !== 'coin') {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        $owner_id = absint(get_post_meta($post_id, '_caes_contributor_id', true));
        $is_admin = caes_is_admin($contributor);

        if (!$is_admin && $owner_id !== (int) $contributor->id) {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        $editable_statuses = array('pending', 'needs_revision');

        if (!$is_admin && !in_array($post->post_status, $editable_statuses, true)) {
            return new WP_Error(
                'rest_submission_not_editable',
                'Only pending or needs-revision submissions can be edited.',
                array('status' => 403)
            );
        }

        $resubmit_after_revision = (!$is_admin && $post->post_status === 'needs_revision');

        $title             = sanitize_text_field($request->get_param('title'));
        $country           = sanitize_text_field($request->get_param('country'));
        $denomination      = sanitize_text_field($request->get_param('denomination'));
        $coin_type         = sanitize_text_field($request->get_param('coin_type') ?? '');
        $short_description = sanitize_textarea_field($request->get_param('short_description') ?? '');
        $year_result       = caes_validate_coin_year($request->get_param('year'));

        if (is_wp_error($year_result)) {
            return $year_result;
        }

        $year = $year_result;

        if (empty($title) || empty($country) || empty($denomination) || empty($coin_type) || empty($short_description)) {
            return new WP_Error(
                'rest_missing_fields',
                'Required fields: title, country, year, denomination, coin_type, short_description.',
                array('status' => 400)
            );
        }

        $params = caes_get_request_merged_params($request);
        $coin_series = null;

        if (array_key_exists('coin_series', $params)) {
            $coin_series = caes_normalize_coin_series_request_value($params['coin_series']);

            if (is_wp_error($coin_series)) {
                return $coin_series;
            }
        }

        $taxonomy_result = caes_validate_submission_taxonomies($country, $denomination, $coin_type, $coin_series);

        if (is_wp_error($taxonomy_result)) {
            return $taxonomy_result;
        }

        $country      = $taxonomy_result['country']['name'];
        $denomination = $taxonomy_result['denomination']['name'];
        $coin_type    = $taxonomy_result['coin_type']['name'];

        $optional_acf_check = caes_validate_optional_acf_fields_from_request($request);

        if (is_wp_error($optional_acf_check)) {
            return $optional_acf_check;
        }

        $old_country      = (string) get_post_meta($post_id, '_caes_country', true);
        $old_year         = absint(get_post_meta($post_id, '_caes_year', true));
        $old_denomination = (string) get_post_meta($post_id, '_caes_denomination', true);
        $old_type_terms   = wp_get_post_terms($post_id, 'coin_type', array('fields' => 'names'));
        $old_coin_type    = (!is_wp_error($old_type_terms) && !empty($old_type_terms)) ? (string) $old_type_terms[0] : '';
        $old_series_terms = wp_get_post_terms($post_id, 'coin_series', array('fields' => 'names'));
        $old_coin_series  = (!is_wp_error($old_series_terms) && !empty($old_series_terms)) ? (string) $old_series_terms[0] : '';
        $old_record_status   = (string) caes_read_coin_acf_value($post_id, 'coin_record_status');
        $old_published       = (int) caes_read_coin_acf_value($post_id, 'coin_is_published_catalogue');
        $old_featured        = (int) caes_read_coin_acf_value($post_id, 'coin_is_featured');
        $old_app_enabled     = (int) caes_read_coin_acf_value($post_id, 'coin_is_app_enabled');
        $old_collector_notes = (string) caes_read_coin_acf_value($post_id, 'coin_collector_notes');
        $old_released_date   = caes_get_coin_released_date_for_codes($post_id);
        $incoming_released_date = array_key_exists('released_date', $params)
            ? caes_normalize_release_date_for_coin_code($params['released_date'])
            : $old_released_date;
        $will_regenerate_code = (
            $old_country !== $country
            || $old_year !== $year
            || $old_denomination !== $denomination
            || $old_coin_type !== $coin_type
            || $old_released_date !== $incoming_released_date
        );

        $duplicate_check = caes_validate_coin_duplicate_codes(
            $params['unique_code'] ?? '',
            $params['coin_code'] ?? '',
            $post_id
        );

        if (is_wp_error($duplicate_check)) {
            return $duplicate_check;
        }

        $updated = wp_update_post(array(
            'ID'         => $post_id,
            'post_title' => $title,
        ), true);

        if (is_wp_error($updated) || empty($updated)) {
            return new WP_Error(
                'rest_submission_update_failed',
                'Failed to update coin submission.',
                array('status' => 500)
            );
        }

        $taxonomy_assign = caes_assign_submission_taxonomies($post_id, $taxonomy_result);

        if (is_wp_error($taxonomy_assign)) {
            return $taxonomy_assign;
        }

        update_post_meta($post_id, '_caes_country', $country);
        update_post_meta($post_id, '_caes_year', $year);
        update_post_meta($post_id, '_caes_denomination', $denomination);
        update_post_meta($post_id, '_caes_short_description', $short_description);

        $content_language = caes_get_submission_content_language($post_id);

        if (array_key_exists('content_language', $params)) {
            $editable_language_statuses = array('pending', 'needs_revision', 'draft');

            if ($is_admin || in_array($post->post_status, $editable_language_statuses, true)) {
                $content_language = caes_normalize_content_language($params['content_language']);
            }
        }

        caes_save_submission_content_language($post_id, $content_language);

        caes_save_coin_acf_fields($post_id, array_merge(
            array(
                'coin_year'              => $year,
                'coin_short_description' => $short_description,
            ),
            caes_get_supported_acf_fields_from_request($request, true, true),
            caes_get_status_fields_from_request($request, $contributor)
        ));

        caes_save_coin_country_code_from_country($post_id, $country);

        if ($will_regenerate_code) {
            $code_result = caes_save_generated_coin_codes(
                $post_id,
                $country,
                $year,
                $denomination,
                $coin_type,
                caes_get_coin_released_date_for_codes($post_id),
                array(
                    'force_new_suffix' => true,
                )
            );

            if (is_wp_error($code_result)) {
                return $code_result;
            }

            if (is_array($code_result)) {
                $generated_duplicate_check = caes_validate_coin_duplicate_codes(
                    $code_result['unique_code'] ?? ($code_result['coin_code'] ?? ''),
                    $code_result['coin_code'] ?? '',
                    $post_id
                );

                if (is_wp_error($generated_duplicate_check)) {
                    return $generated_duplicate_check;
                }
            }
        }

        $taxonomy_changes = array();

        if ($old_country !== $country) {
            $taxonomy_changes['country'] = array(
                'from' => $old_country,
                'to'   => $country,
            );
        }

        if ($old_denomination !== $denomination) {
            $taxonomy_changes['denomination'] = array(
                'from' => $old_denomination,
                'to'   => $denomination,
            );
        }

        if ($old_coin_type !== $coin_type) {
            $taxonomy_changes['coin_type'] = array(
                'from' => $old_coin_type,
                'to'   => $coin_type,
            );
        }

        $new_coin_series = '';

        if (!empty($taxonomy_result['coin_series']['name'])) {
            $new_coin_series = (string) $taxonomy_result['coin_series']['name'];
        } elseif ($coin_series !== null) {
            $new_coin_series = '';
        }

        if ($coin_series !== null && $old_coin_series !== $new_coin_series) {
            $taxonomy_changes['coin_series'] = array(
                'from' => $old_coin_series,
                'to'   => $new_coin_series,
            );
        }

        if (!empty($taxonomy_changes)) {
            caes_log_submission_event(
                $post_id,
                'taxonomy_changed',
                'Taxonomy changed',
                'Submission taxonomy values were updated.',
                array('changes' => $taxonomy_changes),
                $contributor
            );
        }

        caes_save_mint_fields($post_id, caes_get_mint_fields_from_request($request, true));

        $old_obverse_id = caes_get_coin_obverse_attachment_id($post_id);
        $old_reverse_id = caes_get_coin_reverse_attachment_id($post_id);

        $obverse_id = caes_handle_optional_image_replacement('obverse_image', 'replace_obverse_image', $post_id);
        $reverse_id = caes_handle_optional_image_replacement('reverse_image', 'replace_reverse_image', $post_id);

        if (is_wp_error($obverse_id)) {
            return $obverse_id;
        }

        if (is_wp_error($reverse_id)) {
            return $reverse_id;
        }

        if (!empty($obverse_id)) {
            caes_save_coin_obverse_image_id($post_id, $obverse_id);
        }

        if (!empty($reverse_id)) {
            caes_save_coin_reverse_image_id($post_id, $reverse_id);
        }

        $defaults_applied = caes_apply_default_coin_images_if_missing($post_id);

        $gallery_result = caes_update_coin_gallery_from_request($post_id, $request, $contributor);

        if (is_wp_error($gallery_result)) {
            return $gallery_result;
        }

        caes_sync_featured_image_from_obverse(
            $post_id,
            !empty($obverse_id) || !empty($defaults_applied['obverse'])
        );

        if (!empty($obverse_id) && $old_obverse_id > 0 && $old_obverse_id !== absint($obverse_id)) {
            caes_delete_replaced_attachment_if_safe($old_obverse_id, $post_id);
        }

        if (!empty($reverse_id) && $old_reverse_id > 0 && $old_reverse_id !== absint($reverse_id)) {
            caes_delete_replaced_attachment_if_safe($old_reverse_id, $post_id);
        }

        $image_ids_check = caes_validate_coin_obverse_reverse_ids($post_id);

        if (is_wp_error($image_ids_check)) {
            return $image_ids_check;
        }

        caes_log_submission_event(
            $post_id,
            'updated',
            'Submission updated',
            'Coin submission details were updated.',
            array(),
            $contributor
        );

        if (!empty($obverse_id) && $old_obverse_id > 0 && $old_obverse_id !== absint($obverse_id)) {
            caes_log_submission_event(
                $post_id,
                'image_replaced',
                'Obverse image replaced',
                'The obverse image was replaced.',
                array(
                    'field'   => 'coin_image_obverse_id',
                    'old_id'  => $old_obverse_id,
                    'new_id'  => absint($obverse_id),
                ),
                $contributor
            );
        }

        if (!empty($reverse_id) && $old_reverse_id > 0 && $old_reverse_id !== absint($reverse_id)) {
            caes_log_submission_event(
                $post_id,
                'image_replaced',
                'Reverse image replaced',
                'The reverse image was replaced.',
                array(
                    'field'  => 'coin_image_reverse_id',
                    'old_id' => $old_reverse_id,
                    'new_id' => absint($reverse_id),
                ),
                $contributor
            );
        }

        if (caes_sanitize_bool_acf_field($params['saved_draft'] ?? 0) === 1) {
            caes_log_submission_event(
                $post_id,
                'saved_draft',
                'Draft saved',
                'Submission changes were saved as draft.',
                array(),
                $contributor
            );
        }

        $new_record_status   = (string) caes_read_coin_acf_value($post_id, 'coin_record_status');
        $new_published       = (int) caes_read_coin_acf_value($post_id, 'coin_is_published_catalogue');
        $new_featured        = (int) caes_read_coin_acf_value($post_id, 'coin_is_featured');
        $new_app_enabled     = (int) caes_read_coin_acf_value($post_id, 'coin_is_app_enabled');
        $new_collector_notes = (string) caes_read_coin_acf_value($post_id, 'coin_collector_notes');

        if ($old_record_status !== $new_record_status) {
            caes_log_submission_event(
                $post_id,
                'status_changed',
                'Record status changed',
                sprintf('Record status changed from %s to %s.', $old_record_status, $new_record_status),
                array(
                    'from' => $old_record_status,
                    'to'   => $new_record_status,
                ),
                $contributor
            );

            if ($new_record_status === 'hidden') {
                caes_log_submission_event(
                    $post_id,
                    'rejected',
                    'Submission rejected',
                    'Submission record status was set to hidden.',
                    array('record_status' => $new_record_status),
                    $contributor
                );
            }
        }

        if ($old_published !== $new_published) {
            if ($new_published === 1) {
                caes_log_submission_event(
                    $post_id,
                    'published',
                    'Published to catalogue',
                    'Submission was published to the catalogue.',
                    array(
                        'field' => 'coin_is_published_catalogue',
                        'from'  => $old_published,
                        'to'    => $new_published,
                    ),
                    $contributor
                );
            } else {
                caes_log_submission_event(
                    $post_id,
                    'unpublished',
                    'Unpublished from catalogue',
                    'Submission was removed from the catalogue.',
                    array(
                        'field' => 'coin_is_published_catalogue',
                        'from'  => $old_published,
                        'to'    => $new_published,
                    ),
                    $contributor
                );
            }
        }

        if ($old_featured !== $new_featured) {
            caes_log_submission_event(
                $post_id,
                $new_featured === 1 ? 'featured' : 'unfeatured',
                $new_featured === 1 ? 'Featured coin enabled' : 'Featured coin disabled',
                $new_featured === 1
                    ? 'Coin was marked as featured.'
                    : 'Coin was removed from featured.',
                array(
                    'field' => 'coin_is_featured',
                    'from'  => $old_featured,
                    'to'    => $new_featured,
                ),
                $contributor
            );
        }

        if ($old_app_enabled !== $new_app_enabled) {
            caes_log_submission_event(
                $post_id,
                $new_app_enabled === 1 ? 'app_enabled' : 'app_disabled',
                $new_app_enabled === 1 ? 'App enabled' : 'App disabled',
                $new_app_enabled === 1
                    ? 'Coin was enabled in the app.'
                    : 'Coin was disabled in the app.',
                array(
                    'field' => 'coin_is_app_enabled',
                    'from'  => $old_app_enabled,
                    'to'    => $new_app_enabled,
                ),
                $contributor
            );
        }

        if (
            caes_is_admin($contributor)
            && (
                $old_record_status !== $new_record_status
                || $old_published !== $new_published
                || $old_featured !== $new_featured
                || $old_app_enabled !== $new_app_enabled
            )
        ) {
            caes_log_submission_event(
                $post_id,
                'reviewed',
                'Submission reviewed',
                'An administrator reviewed submission status fields.',
                array(),
                $contributor
            );
        }

        if (
            caes_is_admin($contributor)
            && $old_collector_notes !== $new_collector_notes
            && $new_collector_notes !== ''
        ) {
            caes_log_submission_event(
                $post_id,
                'admin_note_added',
                'Admin note added',
                'Administrator notes were updated.',
                array(),
                $contributor
            );
        }

        if ($resubmit_after_revision && caes_sanitize_bool_acf_field($params['saved_draft'] ?? 0) !== 1) {
            $resubmitted = wp_update_post(array(
                'ID'          => $post_id,
                'post_status' => 'pending',
            ), true);

            if (!is_wp_error($resubmitted) && !empty($resubmitted)) {
                delete_post_meta($post_id, '_caes_revision_notes');

                caes_log_submission_event(
                    $post_id,
                    'resubmitted',
                    'Submission resubmitted',
                    'Contributor resubmitted after revision request.',
                    array(
                        'post_status' => array(
                            'from' => 'needs_revision',
                            'to'   => 'pending',
                        ),
                    ),
                    $contributor
                );
            }
        }

        $detail_request = new WP_REST_Request('GET');
        $detail_request->set_param('id', $post_id);
        $detail_request->set_param('_caes_contributor', $contributor);

        $detail = caes_get_my_submission($detail_request);

        if (is_wp_error($detail)) {
            return $detail;
        }

        $data            = $detail->get_data();
        $data['message'] = 'Submission updated successfully.';

        if (is_array($gallery_result)) {
            $data['gallery']       = $gallery_result['gallery'];
            $data['gallery_count'] = $gallery_result['gallery_count'];

            if (!empty($gallery_result['warnings'])) {
                $data['gallery_warnings'] = $gallery_result['warnings'];
            }
        }

        return new WP_REST_Response($data, 200);
    }
}

if (!function_exists('caes_delete_my_submission')) {
    function caes_delete_my_submission(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');
        $post_id     = absint($request->get_param('id'));

        if (empty($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing contributor token.',
                array('status' => 401)
            );
        }

        $post = get_post($post_id);

        if (empty($post) || $post->post_type !== 'coin') {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        $owner_id = absint(get_post_meta($post_id, '_caes_contributor_id', true));
        $is_admin = caes_is_admin($contributor);

        if (!$is_admin && $owner_id !== (int) $contributor->id) {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        if (!$is_admin && $post->post_status !== 'pending') {
            return new WP_Error(
                'rest_submission_not_deletable',
                'Only pending submissions can be deleted.',
                array('status' => 403)
            );
        }

        caes_log_submission_event(
            $post_id,
            'cancelled',
            'Submission cancelled',
            $is_admin ? 'Submission deleted by administrator.' : 'Submission cancelled by contributor.',
            array(
                'post_status' => $post->post_status,
                'action'      => $is_admin ? 'admin_delete' : 'contributor_cancel',
            ),
            $contributor
        );

        $deleted_post = wp_delete_post($post_id, true);

        if (empty($deleted_post)) {
            return new WP_Error(
                'rest_submission_delete_failed',
                'Failed to delete coin submission.',
                array('status' => 500)
            );
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => $is_admin ? 'Submission deleted successfully.' : 'Submission cancelled successfully.',
            'post_id' => $post_id,
            'status'  => 'deleted',
        ), 200);
    }
}
