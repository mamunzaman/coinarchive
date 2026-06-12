<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_delete_coin_attachments_on_purge')) {
    function caes_delete_coin_attachments_on_purge($post_id, $post) {
        if (!$post || $post->post_type !== 'coin') {
            return;
        }

        $attachments = get_posts(array(
            'post_type'      => 'attachment',
            'posts_per_page' => -1,
            'post_parent'    => $post_id,
            'fields'         => 'ids',
        ));

        if (empty($attachments)) {
            return;
        }

        foreach ($attachments as $attachment_id) {
            if (function_exists('caes_is_protected_default_image_attachment') && caes_is_protected_default_image_attachment($attachment_id)) {
                continue;
            }

            $is_featured_elsewhere = get_posts(array(
                'post_type'      => 'any',
                'posts_per_page' => 1,
                'post__not_in'   => array($post_id),
                'meta_query'     => array(
                    array(
                        'key'   => '_thumbnail_id',
                        'value' => $attachment_id,
                    ),
                ),
                'fields'         => 'ids',
            ));

            if (empty($is_featured_elsewhere)) {
                if (function_exists('caes_try_delete_coin_attachment')) {
                    caes_try_delete_coin_attachment($attachment_id, true);
                } else {
                    wp_delete_attachment($attachment_id, true);
                }
            }
        }
    }
}

add_action('before_delete_post', 'caes_delete_coin_attachments_on_purge', 10, 2);

if (!function_exists('caes_register_coin_submission_post_statuses')) {
    function caes_register_coin_submission_post_statuses() {
        register_post_status(
            'needs_revision',
            array(
                'label'                     => _x('Needs revision', 'coin submission status', 'coinarchive-external-submissions'),
                'public'                    => false,
                'internal'                  => false,
                'exclude_from_search'       => true,
                'show_in_admin_all_list'    => true,
                'show_in_admin_status_list' => true,
                'label_count'               => _n_noop(
                    'Needs revision <span class="count">(%s)</span>',
                    'Needs revision <span class="count">(%s)</span>',
                    'coinarchive-external-submissions'
                ),
            )
        );
    }
}

add_action('init', 'caes_register_coin_submission_post_statuses');
