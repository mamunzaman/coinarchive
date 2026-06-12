<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_generate_token')) {
    function caes_generate_token() {
        return bin2hex(random_bytes(24));
    }
}

if (!function_exists('caes_get_contributors_table_name')) {
    function caes_get_contributors_table_name() {
        global $wpdb;

        return $wpdb->prefix . 'caes_contributors';
    }
}

if (!function_exists('caes_get_contributor_record')) {
    function caes_get_contributor_record($contributor_id) {
        global $wpdb;

        $contributor_id = absint($contributor_id);

        if ($contributor_id <= 0) {
            return null;
        }

        return $wpdb->get_row(
            $wpdb->prepare(
                'SELECT id, email, display_name, role, status, email_verified, approved_by, approved_at, created_at, updated_at
                 FROM ' . caes_get_contributors_table_name() . ' WHERE id = %d',
                $contributor_id
            )
        );
    }
}

if (!function_exists('caes_get_all_contributor_records')) {
    function caes_get_all_contributor_records() {
        global $wpdb;

        return $wpdb->get_results(
            'SELECT id, email, display_name, role, status, email_verified, approved_at, created_at
             FROM ' . caes_get_contributors_table_name() . '
             ORDER BY id DESC'
        );
    }
}

if (!function_exists('caes_apply_contributor_approval')) {
    function caes_apply_contributor_approval($contributor_id, $approved_by = 0, $context = 'rest') {
        global $wpdb;

        $contributor = caes_get_contributor_record($contributor_id);

        if (empty($contributor)) {
            return new WP_Error('caes_contributor_not_found', 'Contributor not found.');
        }

        if ($contributor->status === 'approved') {
            return new WP_Error('caes_contributor_already_approved', 'Contributor is already approved.');
        }

        if ((int) ($contributor->email_verified ?? 0) !== 1) {
            return new WP_Error(
                'caes_contributor_email_not_verified',
                'Contributor must verify their email before approval.',
                array('status' => 403)
            );
        }

        $allowed_statuses = $context === 'admin'
            ? array('pending_approval', 'pending_email', 'rejected')
            : array('pending_approval');

        if (!in_array($contributor->status, $allowed_statuses, true)) {
            return new WP_Error(
                'caes_contributor_not_ready',
                'Contributor is not ready for approval.'
            );
        }

        $now         = current_time('mysql');
        $approved_by = absint($approved_by);

        $updated = $wpdb->update(
            caes_get_contributors_table_name(),
            array(
                'status'      => 'approved',
                'approved_at' => $now,
                'approved_by' => $approved_by > 0 ? $approved_by : null,
                'updated_at'  => $now,
            ),
            array('id' => (int) $contributor->id),
            array('%s', '%s', '%d', '%s'),
            array('%d')
        );

        if ($updated === false) {
            return new WP_Error('caes_approval_failed', 'Failed to approve contributor.');
        }

        $fresh_contributor = caes_get_contributor_record($contributor->id);

        if (empty($fresh_contributor) || $fresh_contributor->status !== 'approved') {
            return new WP_Error('caes_approval_failed', 'Contributor approval did not persist.');
        }

        caes_send_contributor_approved_notification((int) $fresh_contributor->id);

        return $fresh_contributor;
    }
}

if (!function_exists('caes_apply_contributor_rejection')) {
    function caes_apply_contributor_rejection($contributor_id) {
        global $wpdb;

        $contributor = caes_get_contributor_record($contributor_id);

        if (empty($contributor)) {
            return new WP_Error('caes_contributor_not_found', 'Contributor not found.');
        }

        if ($contributor->status === 'rejected') {
            return new WP_Error('caes_contributor_already_rejected', 'Contributor is already rejected.');
        }

        $now = current_time('mysql');

        $updated = $wpdb->update(
            caes_get_contributors_table_name(),
            array(
                'status'     => 'rejected',
                'updated_at' => $now,
            ),
            array('id' => (int) $contributor->id),
            array('%s', '%s'),
            array('%d')
        );

        if ($updated === false) {
            return new WP_Error('caes_rejection_failed', 'Failed to reject contributor.');
        }

        $fresh_contributor = caes_get_contributor_record($contributor->id);

        if (!empty($fresh_contributor)) {
            caes_send_contributor_rejected_notification((int) $fresh_contributor->id);
        }

        return $fresh_contributor;
    }
}

if (!function_exists('caes_persist_contributor_role')) {
    function caes_persist_contributor_role($contributor_id, $role) {
        global $wpdb;

        $contributor_id = absint($contributor_id);
        $role           = sanitize_key((string) $role);
        $table_name     = caes_get_contributors_table_name();

        if (!caes_contributors_table_has_role_column()) {
            caes_ensure_contributors_role_column();
        }

        if (!caes_contributors_table_has_role_column()) {
            return new WP_Error(
                'caes_role_column_missing',
                'Contributor role column is missing and could not be created.'
            );
        }

        $updated = $wpdb->query(
            $wpdb->prepare(
                "UPDATE `{$table_name}` SET `role` = %s, `updated_at` = %s WHERE `id` = %d",
                $role,
                current_time('mysql'),
                $contributor_id
            )
        );

        if ($updated === false) {
            $db_error = $wpdb->last_error ? $wpdb->last_error : 'Unknown database error.';

            return new WP_Error(
                'caes_role_update_failed',
                'Failed to update contributor role: ' . $db_error
            );
        }

        return true;
    }
}

if (!function_exists('caes_apply_contributor_role_change')) {
    function caes_apply_contributor_role_change($contributor_id, $role) {
        $contributor_id = absint($contributor_id);
        $role           = sanitize_key((string) $role);

        if (!in_array($role, array('contributor', 'admin'), true)) {
            return new WP_Error('caes_invalid_role', 'Role must be contributor or admin.');
        }

        $contributor = caes_get_contributor_record($contributor_id);

        if (empty($contributor)) {
            return new WP_Error('caes_contributor_not_found', 'Contributor not found.');
        }

        if ($contributor->status !== 'approved') {
            return new WP_Error(
                'caes_contributor_not_approved',
                'Only approved contributors can be assigned a dashboard role.'
            );
        }

        if (caes_get_contributor_role($contributor) === $role) {
            return new WP_Error(
                'caes_role_unchanged',
                sprintf('Contributor already has the %s role.', $role)
            );
        }

        $persisted = caes_persist_contributor_role($contributor_id, $role);

        if (is_wp_error($persisted)) {
            return $persisted;
        }

        $fresh_contributor = caes_get_contributor_record($contributor_id);

        if (empty($fresh_contributor) || caes_get_contributor_role($fresh_contributor) !== $role) {
            return new WP_Error(
                'caes_role_update_failed',
                sprintf(
                    'Role update did not persist for contributor #%d. Expected %s.',
                    $contributor_id,
                    $role
                )
            );
        }

        return $fresh_contributor;
    }
}

if (!function_exists('caes_register_contributor')) {
    function caes_register_contributor(WP_REST_Request $request) {
        return caes_auth_register_contributor($request);
    }
}

if (!function_exists('caes_verify_email')) {
    function caes_verify_email(WP_REST_Request $request) {
        return caes_auth_verify_email($request);
    }
}

if (!function_exists('caes_get_contributor_id_from_request')) {
    function caes_get_contributor_id_from_request(WP_REST_Request $request) {
        $body = $request->get_json_params();

        return absint(
            is_array($body) && isset($body['contributor_id'])
                ? $body['contributor_id']
                : $request->get_param('contributor_id')
        );
    }
}

if (!function_exists('caes_get_contributor_action_auth_context')) {
    function caes_get_contributor_action_auth_context(WP_REST_Request $request) {
        $actor = $request->get_param('_caes_contributor');

        if (!empty($actor) && caes_is_admin($actor)) {
            return array(
                'context'     => 'admin',
                'approved_by' => (int) $actor->id,
            );
        }

        return array(
            'context'     => 'rest',
            'approved_by' => 1,
        );
    }
}

if (!function_exists('caes_map_contributor_action_error_to_rest')) {
    function caes_map_contributor_action_error_to_rest(WP_Error $error) {
        $code    = $error->get_error_code();
        $status  = 500;
        $message = $error->get_error_message();

        if ($code === 'caes_contributor_not_found') {
            $status = 404;
        } elseif (in_array($code, array('caes_contributor_already_approved', 'caes_contributor_already_rejected'), true)) {
            $status = 409;
        } elseif ($code === 'caes_contributor_email_not_verified') {
            $status = 403;
        } elseif (in_array($code, array(
            'caes_contributor_not_ready',
            'caes_invalid_role',
            'caes_contributor_not_approved',
            'caes_role_unchanged',
        ), true)) {
            $status = 400;
        }

        return new WP_Error('rest_' . str_replace('caes_', '', $code), $message, array('status' => $status));
    }
}

if (!function_exists('caes_format_contributor_registered_date_for_api')) {
    function caes_format_contributor_registered_date_for_api($created_at) {
        if (empty($created_at)) {
            return '';
        }

        $formatted = mysql2date('c', $created_at, false);

        return is_string($formatted) ? $formatted : '';
    }
}

if (!function_exists('caes_get_contributor_submission_counts_map')) {
    function caes_get_contributor_submission_counts_map() {
        global $wpdb;

        $rows = $wpdb->get_results(
            "SELECT pm.meta_value AS contributor_id, COUNT(DISTINCT p.ID) AS submission_count
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
             WHERE p.post_type = 'coin'
             AND p.post_status != 'trash'
             AND pm.meta_key = '_caes_contributor_id'
             GROUP BY pm.meta_value"
        );

        $counts = array();

        if (empty($rows)) {
            return $counts;
        }

        foreach ($rows as $row) {
            $counts[absint($row->contributor_id)] = (int) $row->submission_count;
        }

        return $counts;
    }
}

if (!function_exists('caes_count_contributor_submissions')) {
    function caes_count_contributor_submissions($contributor_id, $counts_map = null) {
        $contributor_id = absint($contributor_id);

        if (is_array($counts_map) && array_key_exists($contributor_id, $counts_map)) {
            return (int) $counts_map[$contributor_id];
        }

        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(DISTINCT p.ID)
                 FROM {$wpdb->posts} p
                 INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
                 WHERE p.post_type = 'coin'
                 AND p.post_status != 'trash'
                 AND pm.meta_key = '_caes_contributor_id'
                 AND pm.meta_value = %d",
                $contributor_id
            )
        );
    }
}

if (!function_exists('caes_format_admin_contributor_for_api')) {
    function caes_format_admin_contributor_for_api($contributor, $counts_map = null) {
        if (empty($contributor)) {
            return array();
        }

        $contributor_id = (int) $contributor->id;

        return array(
            'id'               => $contributor_id,
            'display_name'     => (string) $contributor->display_name,
            'email'            => (string) $contributor->email,
            'status'           => (string) $contributor->status,
            'role'             => caes_get_contributor_role($contributor),
            'email_verified'   => (int) $contributor->email_verified === 1,
            'registered_date'  => caes_format_contributor_registered_date_for_api($contributor->created_at),
            'submission_count' => caes_count_contributor_submissions($contributor_id, $counts_map),
        );
    }
}

if (!function_exists('caes_get_admin_contributors')) {
    function caes_get_admin_contributors(WP_REST_Request $request) {
        $contributors = caes_get_all_contributor_records();
        $counts_map   = caes_get_contributor_submission_counts_map();
        $items        = array();

        foreach ($contributors as $contributor) {
            $items[] = caes_format_admin_contributor_for_api($contributor, $counts_map);
        }

        return new WP_REST_Response(array(
            'success'      => true,
            'contributors' => $items,
        ), 200);
    }
}

if (!function_exists('caes_approve_contributor')) {
    function caes_approve_contributor(WP_REST_Request $request) {
        $contributor_id = caes_get_contributor_id_from_request($request);

        if (empty($contributor_id)) {
            return new WP_Error(
                'rest_missing_contributor_id',
                'Contributor ID is required.',
                array('status' => 400)
            );
        }

        $auth   = caes_get_contributor_action_auth_context($request);
        $result = caes_apply_contributor_approval(
            $contributor_id,
            $auth['approved_by'],
            $auth['context']
        );

        if (is_wp_error($result)) {
            if ($result->get_error_code() === 'caes_contributor_email_not_verified') {
                return new WP_REST_Response(array(
                    'success' => false,
                    'code'    => 'EMAIL_NOT_VERIFIED',
                    'message' => $result->get_error_message(),
                ), 403);
            }

            return caes_map_contributor_action_error_to_rest($result);
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Contributor approved successfully.',
            'contributor' => caes_format_admin_contributor_for_api($result),
        ), 200);
    }
}

if (!function_exists('caes_reject_contributor')) {
    function caes_reject_contributor(WP_REST_Request $request) {
        $contributor_id = caes_get_contributor_id_from_request($request);

        if (empty($contributor_id)) {
            return new WP_Error(
                'rest_missing_contributor_id',
                'Contributor ID is required.',
                array('status' => 400)
            );
        }

        $result = caes_apply_contributor_rejection($contributor_id);

        if (is_wp_error($result)) {
            return caes_map_contributor_action_error_to_rest($result);
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Contributor rejected successfully.',
            'contributor' => caes_format_admin_contributor_for_api($result),
        ), 200);
    }
}

if (!function_exists('caes_hash_session_token')) {
    function caes_hash_session_token($token) {
        return hash_hmac('sha256', $token, wp_salt('auth'));
    }
}

if (!function_exists('caes_login_contributor')) {
    function caes_login_contributor(WP_REST_Request $request) {
        return caes_auth_login_contributor($request);
    }
}

if (!function_exists('caes_set_contributor_role')) {
    function caes_set_contributor_role(WP_REST_Request $request) {
        $body           = $request->get_json_params();
        $contributor_id = caes_get_contributor_id_from_request($request);
        $role           = sanitize_key(
            is_array($body) && isset($body['role'])
                ? $body['role']
                : $request->get_param('role')
        );

        if (empty($contributor_id)) {
            return new WP_Error(
                'rest_missing_contributor_id',
                'Contributor ID is required.',
                array('status' => 400)
            );
        }

        if ($role === '') {
            return new WP_Error(
                'rest_invalid_role',
                'Role must be contributor or admin.',
                array('status' => 400)
            );
        }

        $result = caes_apply_contributor_role_change($contributor_id, $role);

        if (is_wp_error($result)) {
            return caes_map_contributor_action_error_to_rest($result);
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Contributor role updated successfully.',
            'contributor' => caes_format_admin_contributor_for_api($result),
        ), 200);
    }
}
