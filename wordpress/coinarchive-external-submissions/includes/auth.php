<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_authenticated_contributor_from_request')) {
    function caes_get_authenticated_contributor_from_request(WP_REST_Request $request) {
        $contributor = $request->get_param('_caes_contributor');

        if (!empty($contributor) && caes_is_contributor($contributor)) {
            return $contributor;
        }

        return null;
    }
}

if (!function_exists('caes_get_contributor_rate_limit_identity')) {
    function caes_get_contributor_rate_limit_identity($contributor) {
        if (empty($contributor)) {
            return 'anonymous';
        }

        return 'contributor_' . absint($contributor->id);
    }
}

if (!function_exists('caes_build_contributor_rate_limit_transient_key')) {
    function caes_build_contributor_rate_limit_transient_key($action, $contributor) {
        $action   = sanitize_key((string) $action);
        $identity = caes_get_contributor_rate_limit_identity($contributor);
        $hash     = hash('sha256', $action . '|' . $identity);

        return 'caes_rl_' . $action . '_' . $hash;
    }
}

if (!function_exists('caes_is_contributor_rate_limited')) {
    function caes_is_contributor_rate_limited($action, $contributor, $max_attempts, $window_seconds) {
        $key   = caes_build_contributor_rate_limit_transient_key($action, $contributor);
        $count = (int) get_transient($key);

        return $count >= (int) $max_attempts;
    }
}

if (!function_exists('caes_record_contributor_rate_limit_attempt')) {
    function caes_record_contributor_rate_limit_attempt($action, $contributor, $window_seconds) {
        $key   = caes_build_contributor_rate_limit_transient_key($action, $contributor);
        $count = (int) get_transient($key);

        set_transient($key, $count + 1, (int) $window_seconds);
    }
}

if (!function_exists('caes_enforce_contributor_rate_limit')) {
    function caes_enforce_contributor_rate_limit($action, $contributor, $max_attempts, $window_seconds) {
        if (caes_is_contributor_rate_limited($action, $contributor, $max_attempts, $window_seconds)) {
            return new WP_REST_Response(array(
                'success' => false,
                'code'    => 'RATE_LIMITED',
                'message' => 'Too many attempts. Please try again later.',
            ), 429);
        }

        caes_record_contributor_rate_limit_attempt($action, $contributor, $window_seconds);

        return null;
    }
}
