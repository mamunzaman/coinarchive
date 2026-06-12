<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_submission_logs_table_name')) {
    function caes_get_submission_logs_table_name() {
        global $wpdb;

        return $wpdb->prefix . 'caes_submission_logs';
    }
}

if (!function_exists('caes_install_submission_logs_table')) {
    function caes_install_submission_logs_table() {
        global $wpdb;

        $table_name      = caes_get_submission_logs_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            post_id bigint(20) unsigned NOT NULL,
            user_id bigint(20) unsigned NOT NULL DEFAULT 0,
            event_type varchar(80) NOT NULL,
            event_label varchar(255) NOT NULL,
            event_message text NULL,
            event_data longtext NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY  (id),
            KEY post_id (post_id),
            KEY created_at (created_at)
        ) $charset_collate;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }
}

if (!function_exists('caes_get_submission_log_user_id')) {
    function caes_get_submission_log_user_id($contributor = null) {
        return caes_get_gallery_actor_user_id($contributor);
    }
}

if (!function_exists('caes_add_submission_log')) {
    function caes_add_submission_log($post_id, $event_type, $event_label, $event_message = '', $event_data = array()) {
        global $wpdb;

        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return false;
        }

        $event_type  = sanitize_key($event_type);
        $event_label = sanitize_text_field($event_label);
        $event_message = sanitize_textarea_field($event_message);

        if (!is_array($event_data)) {
            $event_data = array();
        }

        $contributor = null;

        if (!empty($event_data['contributor'])) {
            $contributor = $event_data['contributor'];
            unset($event_data['contributor']);
        }

        $user_id = caes_get_submission_log_user_id($contributor);

        if (!empty($event_data['contributor_id'])) {
            $event_data['contributor_id'] = absint($event_data['contributor_id']);
        }

        $json_data = empty($event_data) ? null : wp_json_encode($event_data);

        $inserted = $wpdb->insert(
            caes_get_submission_logs_table_name(),
            array(
                'post_id'       => $post_id,
                'user_id'       => $user_id,
                'event_type'    => $event_type,
                'event_label'   => $event_label,
                'event_message' => $event_message,
                'event_data'    => $json_data,
                'created_at'    => current_time('mysql'),
            ),
            array('%d', '%d', '%s', '%s', '%s', '%s', '%s')
        );

        return $inserted !== false;
    }
}

if (!function_exists('caes_format_submission_log_row')) {
    function caes_format_submission_log_row($row) {
        if (empty($row)) {
            return null;
        }

        $event_data = array();

        if (!empty($row->event_data)) {
            $decoded = json_decode($row->event_data, true);

            if (is_array($decoded)) {
                $event_data = $decoded;
            }
        }

        return array(
            'id'            => (int) $row->id,
            'post_id'       => (int) $row->post_id,
            'user_id'       => (int) $row->user_id,
            'event_type'    => (string) $row->event_type,
            'event_label'   => (string) $row->event_label,
            'event_message' => (string) $row->event_message,
            'event_data'    => $event_data,
            'created_at'    => (string) $row->created_at,
        );
    }
}

if (!function_exists('caes_query_submission_logs')) {
    function caes_query_submission_logs($post_id, $limit = 0) {
        global $wpdb;

        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return array();
        }

        $table_name = caes_get_submission_logs_table_name();
        $sql        = "SELECT * FROM $table_name WHERE post_id = %d ORDER BY created_at DESC, id DESC";

        if ($limit > 0) {
            $sql .= $wpdb->prepare(' LIMIT %d', $limit);
        }

        $rows = $wpdb->get_results($wpdb->prepare($sql, $post_id));

        if (empty($rows)) {
            return array();
        }

        $logs = array();

        foreach ($rows as $row) {
            $formatted = caes_format_submission_log_row($row);

            if ($formatted !== null) {
                $logs[] = $formatted;
            }
        }

        return $logs;
    }
}

if (!function_exists('caes_count_submission_logs')) {
    function caes_count_submission_logs($post_id) {
        global $wpdb;

        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return 0;
        }

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                'SELECT COUNT(*) FROM ' . caes_get_submission_logs_table_name() . ' WHERE post_id = %d',
                $post_id
            )
        );
    }
}

if (!function_exists('caes_get_submission_logs')) {
    function caes_get_submission_logs($post_id, $limit = 5) {
        return caes_query_submission_logs($post_id, max(1, absint($limit)));
    }
}

if (!function_exists('caes_get_all_submission_logs')) {
    function caes_get_all_submission_logs($post_id) {
        return caes_query_submission_logs($post_id, 0);
    }
}

if (!function_exists('caes_get_submission_activity_logs_payload')) {
    function caes_get_submission_activity_logs_payload($post_id) {
        $post_id = absint($post_id);

        return array(
            'recent' => caes_get_submission_logs($post_id, 5),
            'total'  => caes_count_submission_logs($post_id),
        );
    }
}

if (!function_exists('caes_can_view_submission_logs')) {
    function caes_can_view_submission_logs($contributor, $post_id) {
        $post_id = absint($post_id);

        if (empty($contributor) || $post_id <= 0) {
            return false;
        }

        $post = get_post($post_id);

        if (empty($post) || $post->post_type !== 'coin') {
            return false;
        }

        if (caes_is_admin($contributor)) {
            return true;
        }

        $owner_id = absint(get_post_meta($post_id, '_caes_contributor_id', true));

        return $owner_id === (int) $contributor->id;
    }
}

if (!function_exists('caes_log_submission_event')) {
    function caes_log_submission_event($post_id, $event_type, $event_label, $event_message = '', $event_data = array(), $contributor = null) {
        if (!is_array($event_data)) {
            $event_data = array();
        }

        if ($contributor !== null) {
            $event_data['contributor']    = $contributor;
            $event_data['contributor_id'] = !empty($contributor->id) ? (int) $contributor->id : 0;
        }

        return caes_add_submission_log($post_id, $event_type, $event_label, $event_message, $event_data);
    }
}
