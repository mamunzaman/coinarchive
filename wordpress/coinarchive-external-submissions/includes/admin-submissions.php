<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_submission_contributor_info')) {
    function caes_get_submission_contributor_info($post_id) {
        global $wpdb;

        $post_id        = absint($post_id);
        $contributor_id = absint(get_post_meta($post_id, '_caes_contributor_id', true));
        $stored_email   = sanitize_email((string) get_post_meta($post_id, '_caes_contributor_email', true));

        if ($contributor_id <= 0) {
            return array(
                'contributor_id' => null,
                'email'          => $stored_email ?: null,
                'display_name'   => null,
                'role'           => null,
                'status'         => null,
            );
        }

        $table_name  = $wpdb->prefix . 'caes_contributors';
        $contributor = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT id, email, display_name, role, status, email_verified, approved_at, last_login, created_at
                 FROM $table_name WHERE id = %d",
                $contributor_id
            )
        );

        if (empty($contributor)) {
            return array(
                'contributor_id' => $contributor_id,
                'email'          => $stored_email ?: null,
                'display_name'   => null,
                'role'           => null,
                'status'         => null,
            );
        }

        return array(
            'contributor_id'   => (int) $contributor->id,
            'email'            => $contributor->email,
            'display_name'     => $contributor->display_name,
            'role'             => caes_get_contributor_role($contributor),
            'status'           => $contributor->status,
            'email_verified'   => (int) $contributor->email_verified === 1,
            'approved_at'      => $contributor->approved_at,
            'last_login'       => $contributor->last_login,
            'registered_at'    => $contributor->created_at,
        );
    }
}

if (!function_exists('caes_get_admin_submission_language_badge')) {
    function caes_get_admin_submission_language_badge($post_id) {
        $lang = caes_get_submission_content_language($post_id);

        return strtoupper($lang);
    }
}

if (!function_exists('caes_get_admin_submission_language_display')) {
    function caes_get_admin_submission_language_display($post_id) {
        $lang = caes_get_submission_content_language($post_id);

        return sprintf('%s — %s', strtoupper($lang), caes_get_content_language_label($lang));
    }
}

if (!function_exists('caes_save_submission_revision_notes')) {
    function caes_save_submission_revision_notes($post_id, $notes) {
        $post_id = absint($post_id);
        $notes   = sanitize_textarea_field((string) $notes);

        if ($post_id <= 0) {
            return '';
        }

        update_post_meta($post_id, '_caes_revision_notes', $notes);

        return $notes;
    }
}

if (!function_exists('caes_get_admin_submission_post_or_error')) {
    function caes_get_admin_submission_post_or_error($post_id) {
        $post_id = absint($post_id);
        $post    = get_post($post_id);

        if (empty($post) || $post->post_type !== 'coin') {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        return $post;
    }
}

if (!function_exists('caes_build_admin_decision_response')) {
    function caes_build_admin_decision_response($post_id, $message, $contributor) {
        $detail_request = new WP_REST_Request('GET');
        $detail_request->set_param('id', absint($post_id));
        $detail_request->set_param('_caes_contributor', $contributor);

        $detail = caes_get_admin_submission($detail_request);

        if (is_wp_error($detail)) {
            return $detail;
        }

        $data = $detail->get_data();

        return new WP_REST_Response(array(
            'success'        => true,
            'message'        => $message,
            'submission_id'  => absint($post_id),
            'submission'     => $data['submission'] ?? null,
            'acf'            => $data['acf'] ?? null,
            'activity_logs'  => $data['activity_logs'] ?? null,
        ), 200);
    }
}

if (!function_exists('caes_format_admin_submission_list_item')) {
    function caes_format_admin_submission_list_item($post) {
        $post_id     = (int) $post->ID;
        $list_images = caes_get_submission_list_images($post_id);
        $item        = array(
            'id'            => $post_id,
            'title'         => get_the_title($post),
            'status'        => $post->post_status,
            'date'          => get_the_date('Y-m-d H:i:s', $post),
            'edit_link'     => get_edit_post_link($post->ID, ''),
            'preview_image' => $list_images['preview_image'],
            'images'        => $list_images['images'],
            'contributor'   => caes_get_submission_contributor_info($post_id),
        );

        caes_apply_submission_review_fields($item, $post_id);

        return $item;
    }
}

if (!function_exists('caes_get_admin_coin_posts')) {
    function caes_get_admin_coin_posts(WP_REST_Request $request) {
        $status = sanitize_key((string) $request->get_param('status'));
        $args   = array(
            'post_type'      => 'coin',
            'post_status'    => 'any',
            'posts_per_page' => -1,
            'orderby'        => 'date',
            'order'          => 'DESC',
        );

        if ($status !== '') {
            $args['post_status'] = $status;
        }

        return get_posts($args);
    }
}

if (!function_exists('caes_get_admin_submissions')) {
    function caes_get_admin_submissions(WP_REST_Request $request) {
        $posts       = caes_get_admin_coin_posts($request);
        $submissions = array();

        foreach ($posts as $post) {
            $submissions[] = caes_format_admin_submission_list_item($post);
        }

        return new WP_REST_Response(array(
            'success'     => true,
            'total'       => count($submissions),
            'submissions' => $submissions,
        ), 200);
    }
}

if (!function_exists('caes_get_admin_submission')) {
    function caes_get_admin_submission(WP_REST_Request $request) {
        $post_id = absint($request->get_param('id'));
        $post    = get_post($post_id);

        if (empty($post) || $post->post_type !== 'coin') {
            return new WP_Error(
                'rest_submission_not_found',
                'Submission not found.',
                array('status' => 404)
            );
        }

        $detail_request = new WP_REST_Request('GET');
        $detail_request->set_param('id', $post_id);
        $detail_request->set_param('_caes_contributor', $request->get_param('_caes_contributor'));

        $detail = caes_get_my_submission($detail_request);

        if (is_wp_error($detail)) {
            return $detail;
        }

        $data = $detail->get_data();

        if (!empty($data['submission']) && is_array($data['submission'])) {
            $data['submission']['contributor'] = caes_get_submission_contributor_info($post_id);
            caes_apply_submission_review_fields($data['submission'], $post_id);
        }

        return new WP_REST_Response($data, 200);
    }
}

if (!function_exists('caes_approve_admin_submission')) {
    function caes_approve_admin_submission(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');
        $post_id     = absint($request->get_param('id'));
        $post        = caes_get_admin_submission_post_or_error($post_id);

        if (is_wp_error($post)) {
            return $post;
        }

        $params              = caes_get_request_merged_params($request);
        $old_post_status     = $post->post_status;
        $old_record_status   = (string) caes_read_coin_acf_value($post_id, 'coin_record_status');
        $old_published       = (int) caes_read_coin_acf_value($post_id, 'coin_is_published_catalogue');
        $publish_catalogue   = array_key_exists('coin_is_published_catalogue', $params)
            ? caes_sanitize_bool_acf_field($params['coin_is_published_catalogue'])
            : 1;

        $code_result = caes_finalize_coin_codes_for_publish($post_id);

        if (is_wp_error($code_result)) {
            return $code_result;
        }

        $duplicate = caes_find_exact_duplicate($post_id);

        if (!empty($duplicate['found'])) {
            caes_log_exact_duplicate_block($post_id, 'approval_blocked', $duplicate, $contributor);

            return caes_build_exact_duplicate_wp_error($duplicate, 'approval');
        }

        $updated = wp_update_post(array(
            'ID'          => $post_id,
            'post_status' => 'publish',
        ), true);

        if (is_wp_error($updated) || empty($updated)) {
            return new WP_Error(
                'rest_submission_approve_failed',
                'Failed to approve submission.',
                array('status' => 500)
            );
        }

        caes_set_polylang_post_language($post_id, caes_get_submission_content_language($post_id));

        caes_save_coin_acf_fields($post_id, array(
            'coin_record_status'          => 'active',
            'coin_is_published_catalogue' => $publish_catalogue,
        ));

        caes_log_submission_event(
            $post_id,
            'approved',
            'Submission approved',
            'Submission was approved by an administrator.',
            array(
                'post_status' => array(
                    'from' => $old_post_status,
                    'to'   => 'publish',
                ),
            ),
            $contributor
        );

        if ($old_record_status !== 'active') {
            caes_log_submission_event(
                $post_id,
                'status_changed',
                'Record status changed',
                sprintf('Record status changed from %s to active.', $old_record_status),
                array(
                    'from' => $old_record_status,
                    'to'   => 'active',
                ),
                $contributor
            );
        }

        if ($publish_catalogue === 1 && $old_published !== 1) {
            caes_log_submission_event(
                $post_id,
                'published',
                'Published to catalogue',
                'Submission was published to the catalogue.',
                array(
                    'field' => 'coin_is_published_catalogue',
                    'from'  => $old_published,
                    'to'    => 1,
                ),
                $contributor
            );
        }

        caes_log_submission_event(
            $post_id,
            'reviewed',
            'Submission reviewed',
            'An administrator approved the submission.',
            array(),
            $contributor
        );

        return caes_build_admin_decision_response($post_id, 'Submission approved.', $contributor);
    }
}

if (!function_exists('caes_reject_admin_submission')) {
    function caes_reject_admin_submission(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');
        $post_id     = absint($request->get_param('id'));
        $post        = caes_get_admin_submission_post_or_error($post_id);

        if (is_wp_error($post)) {
            return $post;
        }

        $params            = caes_get_request_merged_params($request);
        $note              = '';
        $old_post_status   = $post->post_status;
        $old_record_status = (string) caes_read_coin_acf_value($post_id, 'coin_record_status');
        $old_published     = (int) caes_read_coin_acf_value($post_id, 'coin_is_published_catalogue');
        $old_notes         = (string) caes_read_coin_acf_value($post_id, 'coin_collector_notes');

        if (array_key_exists('reason', $params)) {
            $note = sanitize_textarea_field((string) $params['reason']);
        } elseif (array_key_exists('note', $params)) {
            $note = sanitize_textarea_field((string) $params['note']);
        } elseif (array_key_exists('coin_collector_notes', $params)) {
            $note = sanitize_textarea_field((string) $params['coin_collector_notes']);
        }

        $updated = wp_update_post(array(
            'ID'          => $post_id,
            'post_status' => 'draft',
        ), true);

        if (is_wp_error($updated) || empty($updated)) {
            return new WP_Error(
                'rest_submission_reject_failed',
                'Failed to reject submission.',
                array('status' => 500)
            );
        }

        $acf_fields = array(
            'coin_record_status'          => 'hidden',
            'coin_is_published_catalogue' => 0,
        );

        if ($note !== '') {
            $acf_fields['coin_collector_notes'] = $note;
        }

        caes_save_coin_acf_fields($post_id, $acf_fields);

        caes_log_submission_event(
            $post_id,
            'rejected',
            'Submission rejected',
            'Submission was rejected by an administrator.',
            array(
                'post_status' => array(
                    'from' => $old_post_status,
                    'to'   => 'draft',
                ),
            ),
            $contributor
        );

        if ($old_record_status !== 'hidden') {
            caes_log_submission_event(
                $post_id,
                'status_changed',
                'Record status changed',
                sprintf('Record status changed from %s to hidden.', $old_record_status),
                array(
                    'from' => $old_record_status,
                    'to'   => 'hidden',
                ),
                $contributor
            );
        }

        if ($old_published === 1) {
            caes_log_submission_event(
                $post_id,
                'unpublished',
                'Unpublished from catalogue',
                'Submission was removed from the catalogue.',
                array(
                    'field' => 'coin_is_published_catalogue',
                    'from'  => $old_published,
                    'to'    => 0,
                ),
                $contributor
            );
        }

        if ($note !== '' && $old_notes !== $note) {
            caes_log_submission_event(
                $post_id,
                'admin_note_added',
                'Admin note added',
                'Administrator rejection note was saved.',
                array(),
                $contributor
            );
        }

        caes_log_submission_event(
            $post_id,
            'reviewed',
            'Submission reviewed',
            'An administrator rejected the submission.',
            array(),
            $contributor
        );

        return caes_build_admin_decision_response($post_id, 'Submission rejected.', $contributor);
    }
}

if (!function_exists('caes_request_admin_submission_revision')) {
    function caes_request_admin_submission_revision(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');
        $post_id     = absint($request->get_param('id'));
        $post        = caes_get_admin_submission_post_or_error($post_id);

        if (is_wp_error($post)) {
            return $post;
        }

        $params  = caes_get_request_merged_params($request);
        $notes   = '';
        $old_post_status = $post->post_status;

        if (array_key_exists('notes', $params)) {
            $notes = sanitize_textarea_field((string) $params['notes']);
        } elseif (array_key_exists('note', $params)) {
            $notes = sanitize_textarea_field((string) $params['note']);
        }

        if ($notes === '') {
            return new WP_Error(
                'rest_missing_revision_notes',
                'Revision notes are required.',
                array('status' => 400)
            );
        }

        $updated = wp_update_post(array(
            'ID'          => $post_id,
            'post_status' => 'needs_revision',
        ), true);

        if (is_wp_error($updated) || empty($updated)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[CAES] Failed to request submission revision for post ' . $post_id);
            }

            return new WP_Error(
                'rest_submission_revision_failed',
                'Failed to request submission revision.',
                array('status' => 500)
            );
        }

        caes_save_submission_revision_notes($post_id, $notes);

        caes_log_submission_event(
            $post_id,
            'needs_revision',
            'Revision requested',
            'Administrator requested changes to this submission.',
            array(
                'post_status' => array(
                    'from' => $old_post_status,
                    'to'   => 'needs_revision',
                ),
            ),
            $contributor
        );

        caes_log_submission_event(
            $post_id,
            'admin_note_added',
            'Revision notes added',
            'Administrator revision notes were saved.',
            array(),
            $contributor
        );

        caes_log_submission_event(
            $post_id,
            'reviewed',
            'Submission reviewed',
            'An administrator requested a revision.',
            array(),
            $contributor
        );

        return caes_build_admin_decision_response($post_id, 'Revision requested.', $contributor);
    }
}

if (!function_exists('caes_update_admin_submission')) {
    function caes_update_admin_submission(WP_REST_Request $request) {
        return caes_update_my_submission($request);
    }
}

if (!function_exists('caes_count_all_coin_submissions')) {
    function caes_count_all_coin_submissions() {
        global $wpdb;

        return (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'coin' AND post_status != 'trash'"
        );
    }
}

if (!function_exists('caes_count_coin_submissions_by_post_status')) {
    function caes_count_coin_submissions_by_post_status($status) {
        $counts = wp_count_posts('coin');

        return (int) ($counts->{$status} ?? 0);
    }
}

if (!function_exists('caes_count_coin_submissions_by_record_status')) {
    function caes_count_coin_submissions_by_record_status($record_status) {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(DISTINCT p.ID)
                 FROM {$wpdb->posts} p
                 INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
                 WHERE p.post_type = 'coin'
                 AND p.post_status != 'trash'
                 AND pm.meta_key = 'coin_record_status'
                 AND pm.meta_value = %s",
                $record_status
            )
        );
    }
}

if (!function_exists('caes_count_unfinished_draft_submissions')) {
    function caes_count_unfinished_draft_submissions() {
        global $wpdb;

        return (int) $wpdb->get_var(
            "SELECT COUNT(*)
             FROM {$wpdb->posts} p
             WHERE p.post_type = 'coin'
             AND p.post_status IN ('draft', 'auto-draft')
             AND p.ID NOT IN (
                SELECT post_id
                FROM {$wpdb->postmeta}
                WHERE meta_key = 'coin_record_status'
                AND meta_value = 'hidden'
             )"
        );
    }
}

if (!function_exists('caes_count_contributor_records')) {
    function caes_count_contributor_records() {
        global $wpdb;

        return (int) $wpdb->get_var(
            'SELECT COUNT(*) FROM ' . caes_get_contributors_table_name()
        );
    }
}

if (!function_exists('caes_get_admin_submission_stats')) {
    function caes_get_admin_submission_stats() {
        $rejected_by_record = caes_count_coin_submissions_by_record_status('hidden');
        $rejected_by_post   = caes_count_coin_submissions_by_post_status('draft');

        return array(
            'total'          => caes_count_all_coin_submissions(),
            'pending'        => caes_count_coin_submissions_by_post_status('pending'),
            'approved'       => caes_count_coin_submissions_by_post_status('publish'),
            'rejected'       => max($rejected_by_record, $rejected_by_post),
            'draft'          => caes_count_unfinished_draft_submissions(),
            'needs_revision' => caes_count_coin_submissions_by_post_status('needs_revision'),
            'contributors'   => caes_count_contributor_records(),
        );
    }
}

if (!function_exists('caes_get_admin_stats')) {
    function caes_get_admin_stats(WP_REST_Request $request) {
        return new WP_REST_Response(array(
            'success' => true,
            'stats'   => caes_get_admin_submission_stats(),
        ), 200);
    }
}

if (!function_exists('caes_add_coin_content_language_admin_column')) {
    function caes_add_coin_content_language_admin_column($columns) {
        $updated = array();

        foreach ($columns as $key => $label) {
            $updated[$key] = $label;

            if ($key === 'title') {
                $updated['caes_content_language'] = 'Language';
            }
        }

        if (!isset($updated['caes_content_language'])) {
            $updated['caes_content_language'] = 'Language';
        }

        return $updated;
    }
}

if (!function_exists('caes_render_coin_content_language_admin_column')) {
    function caes_render_coin_content_language_admin_column($column, $post_id) {
        if ($column !== 'caes_content_language') {
            return;
        }

        echo esc_html(caes_get_admin_submission_language_display($post_id));
    }
}

if (!function_exists('caes_add_coin_content_language_meta_box')) {
    function caes_add_coin_content_language_meta_box() {
        add_meta_box(
            'caes_content_language',
            'Content language',
            'caes_render_coin_content_language_meta_box',
            'coin',
            'side',
            'high'
        );
    }
}

if (!function_exists('caes_render_coin_content_language_meta_box')) {
    function caes_render_coin_content_language_meta_box($post) {
        $lang        = caes_get_submission_content_language($post->ID);
        $translation = caes_get_submission_translation_status($post->ID);

        echo '<div style="border-left:4px solid #2271b1;padding:8px 10px;background:#f6f7f7;">';
        echo '<p><strong>Content language:</strong><br>' . esc_html(strtoupper($lang) . ' — ' . caes_get_content_language_label($lang)) . '</p>';
        echo '<p>' . esc_html(sprintf(
            'This submission should be reviewed and published as %s content.',
            $lang === 'en' ? 'English' : 'German'
        )) . '</p>';
        echo '<p><strong>' . esc_html($translation['translation_status_label']) . '</strong></p>';
        echo '</div>';
    }
}

add_filter('manage_coin_posts_columns', 'caes_add_coin_content_language_admin_column');
add_action('manage_coin_posts_custom_column', 'caes_render_coin_content_language_admin_column', 10, 2);
add_action('add_meta_boxes_coin', 'caes_add_coin_content_language_meta_box');
