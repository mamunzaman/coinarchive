<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_verify_api_key')) {
    function caes_verify_api_key(WP_REST_Request $request) {
        $provided_key = $request->get_header('X-CoinArchive-Key');

        if (empty($provided_key) || !hash_equals(COINARCHIVE_SUBMISSION_API_KEY, $provided_key)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing API key.',
                array('status' => 401)
            );
        }

        return true;
    }
}

if (!function_exists('caes_get_contributor_role')) {
    function caes_get_contributor_role($contributor) {
        if (empty($contributor)) {
            return 'contributor';
        }

        $role = '';

        if (is_object($contributor) && isset($contributor->role)) {
            $role = (string) $contributor->role;
        } elseif (is_array($contributor) && isset($contributor['role'])) {
            $role = (string) $contributor['role'];
        }

        $role = sanitize_key($role);

        return in_array($role, array('admin', 'contributor'), true) ? $role : 'contributor';
    }
}

if (!function_exists('caes_is_admin')) {
    function caes_is_admin($contributor) {
        return caes_get_contributor_role($contributor) === 'admin';
    }
}

if (!function_exists('caes_is_contributor')) {
    function caes_is_contributor($contributor) {
        $role = caes_get_contributor_role($contributor);

        return $role === 'contributor' || $role === 'admin';
    }
}

if (!function_exists('caes_get_bearer_token')) {
    function caes_get_bearer_token(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');

        if (empty($auth_header)) {
            return '';
        }

        if (preg_match('/Bearer\s+(\S+)/i', $auth_header, $matches)) {
            return sanitize_text_field($matches[1]);
        }

        return '';
    }
}

if (!function_exists('caes_get_contributor_from_token')) {
    function caes_get_contributor_from_token($token) {
        global $wpdb;

        if (empty($token)) {
            return null;
        }

        $token_hash     = caes_hash_session_token($token);
        $now            = current_time('mysql');
        $sessions_table = $wpdb->prefix . 'caes_sessions';

        $session = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT id, contributor_id FROM $sessions_table WHERE token_hash = %s AND expires_at >= %s",
                $token_hash,
                $now
            )
        );

        if (empty($session)) {
            return null;
        }

        $contributor = caes_get_contributor_record((int) $session->contributor_id);

        if (empty($contributor) || (int) $contributor->email_verified !== 1 || $contributor->status !== 'approved') {
            return null;
        }

        $wpdb->update(
            $sessions_table,
            array('last_used_at' => $now),
            array('id' => (int) $session->id),
            array('%s'),
            array('%d')
        );

        return $contributor;
    }
}

if (!function_exists('caes_verify_contributor_token')) {
    function caes_verify_contributor_token(WP_REST_Request $request) {
        $token       = caes_get_bearer_token($request);
        $contributor = caes_get_contributor_from_token($token);

        if (empty($contributor) || !caes_is_contributor($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing contributor token.',
                array('status' => 401)
            );
        }

        $request->set_param('_caes_contributor', $contributor);

        return true;
    }
}

if (!function_exists('caes_verify_admin_token')) {
    function caes_verify_admin_token(WP_REST_Request $request) {
        $token       = caes_get_bearer_token($request);
        $contributor = caes_get_contributor_from_token($token);

        if (empty($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing authentication token.',
                array('status' => 401)
            );
        }

        if (!caes_is_admin($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Admin access required.',
                array('status' => 403)
            );
        }

        $request->set_param('_caes_contributor', $contributor);

        return true;
    }
}

if (!function_exists('caes_verify_api_key_or_admin_token')) {
    function caes_verify_api_key_or_admin_token(WP_REST_Request $request) {
        $provided_key = $request->get_header('X-CoinArchive-Key');

        if (!empty($provided_key) && hash_equals(COINARCHIVE_SUBMISSION_API_KEY, $provided_key)) {
            return true;
        }

        return caes_verify_admin_token($request);
    }
}

if (!function_exists('caes_verify_submission_access')) {
    function caes_verify_submission_access(WP_REST_Request $request) {
        $provided_key = $request->get_header('X-CoinArchive-Key');

        if (!empty($provided_key) && hash_equals(COINARCHIVE_SUBMISSION_API_KEY, $provided_key)) {
            return true;
        }

        $token       = caes_get_bearer_token($request);
        $contributor = caes_get_contributor_from_token($token);

        if (!empty($contributor)) {
            $request->set_param('_caes_contributor', $contributor);
            return true;
        }

        return new WP_Error(
            'rest_forbidden',
            'Invalid or missing authentication credentials.',
            array('status' => 401)
        );
    }
}
