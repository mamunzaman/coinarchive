<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_install_contributors_table')) {
    function caes_install_contributors_table() {
        global $wpdb;

        $table_name      = $wpdb->prefix . 'caes_contributors';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            email varchar(190) NOT NULL,
            password_hash varchar(255) NOT NULL,
            display_name varchar(190) NOT NULL,
            role varchar(30) NOT NULL DEFAULT 'contributor',
            status varchar(30) NOT NULL DEFAULT 'pending_email',
            email_verified tinyint(1) NOT NULL DEFAULT 0,
            verification_token varchar(255) NULL,
            verification_token_hash varchar(255) NULL,
            verification_expires_at datetime NULL,
            verification_sent_at datetime NULL,
            email_verified_at datetime NULL,
            password_reset_token_hash varchar(255) NULL,
            password_reset_expires_at datetime NULL,
            password_reset_sent_at datetime NULL,
            approved_by bigint(20) unsigned NULL,
            approved_at datetime NULL,
            last_login datetime NULL,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY email (email),
            KEY contributor_status (status)
        ) $charset_collate;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }
}

if (!function_exists('caes_install_sessions_table')) {
    function caes_install_sessions_table() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'caes_sessions';

        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table_name)) === $table_name) {
            return;
        }

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            contributor_id bigint(20) unsigned NOT NULL,
            token_hash varchar(255) NOT NULL,
            expires_at datetime NOT NULL,
            created_at datetime NOT NULL,
            last_used_at datetime NULL,
            PRIMARY KEY  (id),
            KEY contributor_id (contributor_id),
            KEY token_hash (token_hash),
            KEY expires_at (expires_at)
        ) $charset_collate;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }
}

if (!function_exists('caes_contributors_table_has_role_column')) {
    function caes_contributors_table_has_role_column() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'caes_contributors';
        $column     = $wpdb->get_var(
            $wpdb->prepare('SHOW COLUMNS FROM `' . $table_name . '` LIKE %s', 'role')
        );

        return !empty($column);
    }
}

if (!function_exists('caes_ensure_contributors_role_column')) {
    function caes_ensure_contributors_role_column() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'caes_contributors';

        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table_name)) !== $table_name) {
            caes_install_contributors_table();
            return;
        }

        if (caes_contributors_table_has_role_column()) {
            return;
        }

        $wpdb->query(
            "ALTER TABLE `{$table_name}` ADD COLUMN `role` varchar(30) NOT NULL DEFAULT 'contributor' AFTER `display_name`"
        );

        $wpdb->query(
            "UPDATE `{$table_name}` SET `role` = 'contributor' WHERE `role` IS NULL OR `role` = ''"
        );
    }
}

if (!function_exists('caes_install_tables')) {
    function caes_install_tables() {
        caes_install_contributors_table();
        caes_ensure_contributors_role_column();
        caes_install_sessions_table();
        caes_install_submission_logs_table();
    }
}

if (!function_exists('caes_sync_mismatched_coin_code_audit_meta')) {
    function caes_sync_mismatched_coin_code_audit_meta() {
        global $wpdb;

        $rows = $wpdb->get_results(
            "SELECT canonical.post_id, canonical.meta_value AS coin_code
             FROM {$wpdb->postmeta} canonical
             INNER JOIN {$wpdb->posts} p ON p.ID = canonical.post_id
             INNER JOIN {$wpdb->postmeta} audit ON audit.post_id = canonical.post_id AND audit.meta_key = '_caes_coin_code'
             WHERE p.post_type = 'coin'
             AND p.post_status != 'trash'
             AND canonical.meta_key = 'coin_code'
             AND canonical.meta_value != ''
             AND audit.meta_value != canonical.meta_value"
        );

        if (empty($rows)) {
            return;
        }

        foreach ($rows as $row) {
            update_post_meta(
                absint($row->post_id),
                '_caes_coin_code',
                sanitize_text_field((string) $row->coin_code)
            );
        }
    }
}

if (!function_exists('caes_contributors_table_has_column')) {
    function caes_contributors_table_has_column($column_name) {
        global $wpdb;

        $table_name = $wpdb->prefix . 'caes_contributors';
        $column     = $wpdb->get_var(
            $wpdb->prepare('SHOW COLUMNS FROM `' . $table_name . '` LIKE %s', $column_name)
        );

        return !empty($column);
    }
}

if (!function_exists('caes_ensure_contributors_email_verification_columns')) {
    function caes_ensure_contributors_email_verification_columns() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'caes_contributors';

        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table_name)) !== $table_name) {
            caes_install_contributors_table();
            return;
        }

        $columns = array(
            'verification_token_hash' => "ADD COLUMN `verification_token_hash` varchar(255) NULL AFTER `verification_token`",
            'verification_expires_at' => "ADD COLUMN `verification_expires_at` datetime NULL AFTER `verification_token_hash`",
            'verification_sent_at'    => "ADD COLUMN `verification_sent_at` datetime NULL AFTER `verification_expires_at`",
            'email_verified_at'       => "ADD COLUMN `email_verified_at` datetime NULL AFTER `verification_sent_at`",
        );

        foreach ($columns as $column_name => $alter_sql) {
            if (!caes_contributors_table_has_column($column_name)) {
                $wpdb->query("ALTER TABLE `{$table_name}` {$alter_sql}");
            }
        }
    }
}

if (!function_exists('caes_backfill_existing_contributors_as_verified')) {
    function caes_backfill_existing_contributors_as_verified() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'caes_contributors';
        $now        = current_time('mysql');

        $wpdb->query(
            $wpdb->prepare(
                "UPDATE `{$table_name}`
                 SET `email_verified` = 1,
                     `email_verified_at` = COALESCE(`email_verified_at`, `approved_at`, `updated_at`, `created_at`, %s)
                 WHERE `email_verified` = 0
                 AND `status` != 'pending_email'",
                $now
            )
        );
    }
}

if (!function_exists('caes_ensure_contributors_password_reset_columns')) {
    function caes_ensure_contributors_password_reset_columns() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'caes_contributors';

        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table_name)) !== $table_name) {
            caes_install_contributors_table();
            return;
        }

        $columns = array(
            'password_reset_token_hash' => "ADD COLUMN `password_reset_token_hash` varchar(255) NULL AFTER `email_verified_at`",
            'password_reset_expires_at' => "ADD COLUMN `password_reset_expires_at` datetime NULL AFTER `password_reset_token_hash`",
            'password_reset_sent_at'    => "ADD COLUMN `password_reset_sent_at` datetime NULL AFTER `password_reset_expires_at`",
        );

        foreach ($columns as $column_name => $alter_sql) {
            if (!caes_contributors_table_has_column($column_name)) {
                $wpdb->query("ALTER TABLE `{$table_name}` {$alter_sql}");
            }
        }
    }
}

if (!function_exists('caes_maybe_upgrade_database')) {
    function caes_maybe_upgrade_database() {
        $version = (string) get_option('caes_db_version', '0');

        caes_install_contributors_table();
        caes_ensure_contributors_role_column();

        if (version_compare($version, '1.4', '<')) {
            update_option('caes_db_version', '1.4');
            $version = '1.4';
        }

        if (version_compare($version, '1.5', '<')) {
            caes_sync_mismatched_coin_code_audit_meta();
            update_option('caes_db_version', '1.5');
            $version = '1.5';
        }

        if (version_compare($version, '1.6', '<')) {
            caes_ensure_contributors_email_verification_columns();
            caes_backfill_existing_contributors_as_verified();
            update_option('caes_db_version', '1.6');
            $version = '1.6';
        }

        if (version_compare($version, '1.7', '<')) {
            caes_ensure_contributors_password_reset_columns();
            update_option('caes_db_version', '1.7');
        }
    }
}

if (!function_exists('caes_activate_plugin')) {
    function caes_activate_plugin() {
        caes_install_tables();
        caes_ensure_contributors_email_verification_columns();
        caes_backfill_existing_contributors_as_verified();
        caes_ensure_contributors_password_reset_columns();
        update_option('caes_db_version', '1.7');
    }
}
