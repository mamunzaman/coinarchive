<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_register_contributors_admin_menu')) {
    function caes_register_contributors_admin_menu() {
        add_menu_page(
            'CoinArchive Contributors',
            'CoinArchive',
            'manage_options',
            'caes-contributors',
            'caes_render_contributors_admin_page',
            'dashicons-archive',
            58
        );

        add_submenu_page(
            'caes-contributors',
            'Contributors',
            'Contributors',
            'manage_options',
            'caes-contributors',
            'caes_render_contributors_admin_page'
        );
    }
}

if (!function_exists('caes_get_contributors_admin_page_url')) {
    function caes_get_contributors_admin_page_url($args = array()) {
        $args = array_merge(array('page' => 'caes-contributors'), $args);

        return add_query_arg($args, admin_url('admin.php'));
    }
}

if (!function_exists('caes_get_contributor_admin_action_url')) {
    function caes_get_contributor_admin_action_url($action, $contributor_id) {
        $contributor_id = absint($contributor_id);
        $action         = sanitize_key((string) $action);

        return wp_nonce_url(
            caes_get_contributors_admin_page_url(array(
                'caes_action'     => $action,
                'contributor_id'  => $contributor_id,
            )),
            'caes_contributor_action_' . $action . '_' . $contributor_id
        );
    }
}

if (!function_exists('caes_handle_contributor_admin_actions')) {
    function caes_handle_contributor_admin_actions() {
        if (!is_admin() || !current_user_can('manage_options')) {
            return;
        }

        $action = sanitize_key((string) wp_unslash($_GET['caes_action'] ?? ''));

        if ($action === '') {
            return;
        }

        $contributor_id = absint($_GET['contributor_id'] ?? 0);

        if ($contributor_id <= 0) {
            return;
        }

        check_admin_referer('caes_contributor_action_' . $action . '_' . $contributor_id);

        $redirect_args = array(
            'page' => 'caes-contributors',
        );
        $result        = null;

        switch ($action) {
            case 'approve':
                $result = caes_apply_contributor_approval(
                    $contributor_id,
                    get_current_user_id(),
                    'admin'
                );
                break;

            case 'reject':
                $result = caes_apply_contributor_rejection($contributor_id);
                break;

            case 'promote_admin':
                $result = caes_apply_contributor_role_change($contributor_id, 'admin');
                break;

            case 'demote_contributor':
                $result = caes_apply_contributor_role_change($contributor_id, 'contributor');
                break;

            default:
                $redirect_args['caes_notice'] = 'error';
                $redirect_args['caes_message'] = rawurlencode('Unknown action.');
                wp_safe_redirect(caes_get_contributors_admin_page_url($redirect_args));
                exit;
        }

        if (is_wp_error($result)) {
            $redirect_args['caes_notice']  = 'error';
            $redirect_args['caes_message'] = rawurlencode($result->get_error_message());
        } else {
            $redirect_args['caes_notice'] = 'success';
            $redirect_args['caes_message'] = rawurlencode(
                caes_get_contributor_admin_success_message($action, $contributor_id, $result)
            );
        }

        wp_safe_redirect(caes_get_contributors_admin_page_url($redirect_args));
        exit;
    }
}

if (!function_exists('caes_get_contributor_admin_success_message')) {
    function caes_get_contributor_admin_success_message($action, $contributor_id, $result = null) {
        $contributor_id = absint($contributor_id);
        $saved_role     = '';

        if (!empty($result) && is_object($result) && isset($result->id)) {
            $saved_role = caes_get_contributor_role($result);
        }

        switch ($action) {
            case 'approve':
                return sprintf('Contributor #%d approved successfully.', $contributor_id);
            case 'reject':
                return sprintf('Contributor #%d rejected successfully.', $contributor_id);
            case 'promote_admin':
                return $saved_role === 'admin'
                    ? sprintf('Contributor #%d promoted to admin.', $contributor_id)
                    : sprintf('Contributor #%d role update completed, but saved role is %s.', $contributor_id, $saved_role ?: 'unknown');
            case 'demote_contributor':
                return $saved_role === 'contributor'
                    ? sprintf('Contributor #%d demoted to contributor.', $contributor_id)
                    : sprintf('Contributor #%d role update completed, but saved role is %s.', $contributor_id, $saved_role ?: 'unknown');
            default:
                return 'Action completed successfully.';
        }
    }
}

if (!function_exists('caes_render_contributor_admin_notices')) {
    function caes_render_contributor_admin_notices() {
        $notice  = sanitize_key((string) wp_unslash($_GET['caes_notice'] ?? ''));
        $message = sanitize_text_field(wp_unslash($_GET['caes_message'] ?? ''));

        if ($notice === '' || $message === '') {
            return;
        }

        $class = $notice === 'success' ? 'notice-success' : 'notice-error';

        printf(
            '<div class="notice %1$s is-dismissible"><p>%2$s</p></div>',
            esc_attr($class),
            esc_html($message)
        );
    }
}

if (!function_exists('caes_format_contributor_status_label')) {
    function caes_format_contributor_status_label($status) {
        $status = sanitize_key((string) $status);

        return str_replace('_', ' ', $status);
    }
}

if (!function_exists('caes_can_show_contributor_approve_action')) {
    function caes_can_show_contributor_approve_action($contributor) {
        return in_array($contributor->status, array('pending_approval', 'pending_email', 'rejected'), true);
    }
}

if (!function_exists('caes_can_show_contributor_reject_action')) {
    function caes_can_show_contributor_reject_action($contributor) {
        return $contributor->status !== 'rejected';
    }
}

if (!function_exists('caes_render_contributor_admin_actions')) {
    function caes_render_contributor_admin_actions($contributor) {
        $actions = array();
        $role    = caes_get_contributor_role($contributor);

        if (caes_can_show_contributor_approve_action($contributor)) {
            $actions[] = sprintf(
                '<a href="%1$s">%2$s</a>',
                esc_url(caes_get_contributor_admin_action_url('approve', $contributor->id)),
                esc_html__('Approve', 'coinarchive-external-submissions')
            );
        }

        if (caes_can_show_contributor_reject_action($contributor)) {
            $actions[] = sprintf(
                '<a href="%1$s" class="submitdelete">%2$s</a>',
                esc_url(caes_get_contributor_admin_action_url('reject', $contributor->id)),
                esc_html__('Reject', 'coinarchive-external-submissions')
            );
        }

        if ($contributor->status === 'approved' && $role === 'contributor') {
            $actions[] = sprintf(
                '<a href="%1$s">%2$s</a>',
                esc_url(caes_get_contributor_admin_action_url('promote_admin', $contributor->id)),
                esc_html__('Promote to Admin', 'coinarchive-external-submissions')
            );
        }

        if ($contributor->status === 'approved' && $role === 'admin') {
            $actions[] = sprintf(
                '<a href="%1$s">%2$s</a>',
                esc_url(caes_get_contributor_admin_action_url('demote_contributor', $contributor->id)),
                esc_html__('Demote to Contributor', 'coinarchive-external-submissions')
            );
        }

        if (empty($actions)) {
            return '&mdash;';
        }

        return implode(' | ', $actions);
    }
}

if (!function_exists('caes_render_contributors_admin_page')) {
    function caes_render_contributors_admin_page() {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to access this page.', 'coinarchive-external-submissions'));
        }

        $contributors = caes_get_all_contributor_records();
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('CoinArchive Contributors', 'coinarchive-external-submissions'); ?></h1>
            <?php caes_render_contributor_admin_notices(); ?>
            <p><?php esc_html_e('Manage React dashboard contributor accounts. Approve users after email verification, then promote approved users to admin when needed.', 'coinarchive-external-submissions'); ?></p>
            <table class="widefat striped">
                <thead>
                    <tr>
                        <th scope="col"><?php esc_html_e('ID', 'coinarchive-external-submissions'); ?></th>
                        <th scope="col"><?php esc_html_e('Name', 'coinarchive-external-submissions'); ?></th>
                        <th scope="col"><?php esc_html_e('Email', 'coinarchive-external-submissions'); ?></th>
                        <th scope="col"><?php esc_html_e('Status', 'coinarchive-external-submissions'); ?></th>
                        <th scope="col"><?php esc_html_e('Role', 'coinarchive-external-submissions'); ?></th>
                        <th scope="col"><?php esc_html_e('Email verified', 'coinarchive-external-submissions'); ?></th>
                        <th scope="col"><?php esc_html_e('Registered date', 'coinarchive-external-submissions'); ?></th>
                        <th scope="col"><?php esc_html_e('Actions', 'coinarchive-external-submissions'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($contributors)) : ?>
                        <tr>
                            <td colspan="8"><?php esc_html_e('No contributors found.', 'coinarchive-external-submissions'); ?></td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($contributors as $contributor) : ?>
                            <tr>
                                <td><?php echo esc_html((string) $contributor->id); ?></td>
                                <td><?php echo esc_html($contributor->display_name); ?></td>
                                <td><?php echo esc_html($contributor->email); ?></td>
                                <td><?php echo esc_html(caes_format_contributor_status_label($contributor->status)); ?></td>
                                <td><?php echo esc_html(caes_get_contributor_role($contributor)); ?></td>
                                <td><?php echo (int) $contributor->email_verified === 1 ? esc_html__('Yes', 'coinarchive-external-submissions') : esc_html__('No', 'coinarchive-external-submissions'); ?></td>
                                <td><?php echo esc_html($contributor->created_at); ?></td>
                                <td><?php echo wp_kses_post(caes_render_contributor_admin_actions($contributor)); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }
}

add_action('admin_menu', 'caes_register_contributors_admin_menu');
add_action('admin_init', 'caes_handle_contributor_admin_actions');
