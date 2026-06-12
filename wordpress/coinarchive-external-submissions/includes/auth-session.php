<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_session_by_token')) {
    function caes_get_session_by_token($token) {
        global $wpdb;

        $token = sanitize_text_field((string) $token);

        if ($token === '') {
            return null;
        }

        $token_hash     = caes_hash_session_token($token);
        $now            = current_time('mysql');
        $sessions_table = $wpdb->prefix . 'caes_sessions';

        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT id, contributor_id, token_hash, expires_at, created_at, last_used_at
                 FROM {$sessions_table}
                 WHERE token_hash = %s AND expires_at >= %s
                 LIMIT 1",
                $token_hash,
                $now
            )
        );
    }
}

if (!function_exists('caes_revoke_session_by_token')) {
    function caes_revoke_session_by_token($token) {
        global $wpdb;

        $token = sanitize_text_field((string) $token);

        if ($token === '') {
            return false;
        }

        $sessions_table = $wpdb->prefix . 'caes_sessions';
        $deleted        = $wpdb->delete(
            $sessions_table,
            array('token_hash' => caes_hash_session_token($token)),
            array('%s')
        );

        return $deleted !== false && $deleted > 0;
    }
}

if (!function_exists('caes_revoke_all_contributor_sessions')) {
    function caes_revoke_all_contributor_sessions($contributor_id) {
        global $wpdb;

        $contributor_id = absint($contributor_id);

        if ($contributor_id <= 0) {
            return false;
        }

        $sessions_table = $wpdb->prefix . 'caes_sessions';

        $deleted = $wpdb->delete(
            $sessions_table,
            array('contributor_id' => $contributor_id),
            array('%d')
        );

        return $deleted !== false;
    }
}

if (!function_exists('caes_verify_bearer_session_exists')) {
    function caes_verify_bearer_session_exists(WP_REST_Request $request) {
        $token   = caes_get_bearer_token($request);
        $session = caes_get_session_by_token($token);

        if (empty($session)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing authentication token.',
                array('status' => 401)
            );
        }

        $request->set_param('_caes_session_token', $token);

        return true;
    }
}

if (!function_exists('caes_format_contributor_profile_for_auth_api')) {
    function caes_format_contributor_profile_for_auth_api($contributor) {
        if (empty($contributor)) {
            return array();
        }

        $email_verified_at = '';

        if (!empty($contributor->email_verified_at)) {
            $formatted = mysql2date('c', $contributor->email_verified_at, false);
            $email_verified_at = is_string($formatted) ? $formatted : '';
        }

        return array(
            'id'                => (int) $contributor->id,
            'email'             => (string) $contributor->email,
            'display_name'      => (string) $contributor->display_name,
            'status'            => (string) $contributor->status,
            'role'              => caes_get_contributor_role($contributor),
            'email_verified'    => (int) ($contributor->email_verified ?? 0) === 1,
            'email_verified_at' => $email_verified_at,
        );
    }
}

if (!function_exists('caes_auth_get_current_contributor')) {
    function caes_auth_get_current_contributor(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');

        if (!empty($contributor)) {
            $auth_record = caes_get_contributor_auth_record((int) $contributor->id);

            if (!empty($auth_record)) {
                return new WP_REST_Response(array(
                    'success' => true,
                    'data'    => array(
                        'contributor' => caes_format_contributor_profile_for_auth_api($auth_record),
                    ),
                ), 200);
            }
        }

        return new WP_REST_Response(array(
            'success' => false,
            'code'    => 'UNAUTHORIZED',
            'message' => 'Authentication required.',
        ), 401);
    }
}

if (!function_exists('caes_auth_logout_contributor')) {
    function caes_auth_logout_contributor(WP_REST_Request $request) {
        $token = sanitize_text_field((string) $request->get_param('_caes_session_token'));

        if ($token === '') {
            $token = caes_get_bearer_token($request);
        }

        if ($token === '' || !caes_revoke_session_by_token($token)) {
            return new WP_REST_Response(array(
                'success' => false,
                'code'    => 'UNAUTHORIZED',
                'message' => 'Invalid or missing authentication token.',
            ), 401);
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Logged out successfully.',
        ), 200);
    }
}
