<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_generate_password_reset_token')) {
    function caes_generate_password_reset_token() {
        if (function_exists('wp_generate_password')) {
            return wp_generate_password(48, false, false);
        }

        return bin2hex(random_bytes(24));
    }
}

if (!function_exists('caes_hash_password_reset_token')) {
    function caes_hash_password_reset_token($raw_token) {
        return hash_hmac('sha256', (string) $raw_token, wp_salt('caes_password_reset'));
    }
}

if (!function_exists('caes_get_password_reset_expiry_datetime')) {
    function caes_get_password_reset_expiry_datetime() {
        return gmdate('Y-m-d H:i:s', time() + HOUR_IN_SECONDS);
    }
}

if (!function_exists('caes_is_password_reset_token_expired')) {
    function caes_is_password_reset_token_expired($expires_at) {
        if (empty($expires_at)) {
            return true;
        }

        $expires_timestamp = strtotime((string) $expires_at . ' UTC');

        return $expires_timestamp === false || $expires_timestamp < time();
    }
}

if (!function_exists('caes_issue_password_reset_token')) {
    function caes_issue_password_reset_token($contributor_id) {
        global $wpdb;

        $contributor_id = absint($contributor_id);
        $contributor    = caes_get_contributor_auth_record($contributor_id);

        if (empty($contributor)) {
            return new WP_Error('caes_contributor_not_found', 'Contributor not found.');
        }

        $raw_token  = caes_generate_password_reset_token();
        $token_hash = caes_hash_password_reset_token($raw_token);
        $now        = current_time('mysql');
        $expires_at = caes_get_password_reset_expiry_datetime();

        $updated = $wpdb->update(
            caes_get_contributors_table_name(),
            array(
                'password_reset_token_hash' => $token_hash,
                'password_reset_expires_at' => $expires_at,
                'password_reset_sent_at'    => $now,
                'updated_at'                => $now,
            ),
            array('id' => $contributor_id),
            array('%s', '%s', '%s', '%s'),
            array('%d')
        );

        if ($updated === false) {
            return new WP_Error('caes_password_reset_token_failed', 'Failed to create password reset token.');
        }

        return array(
            'raw_token'  => $raw_token,
            'expires_at' => $expires_at,
        );
    }
}

if (!function_exists('caes_send_password_reset_email')) {
    function caes_send_password_reset_email($contributor_id, $raw_token = '') {
        $contributor = caes_get_contributor_auth_record($contributor_id);

        if (empty($contributor)) {
            return new WP_Error('caes_contributor_not_found', 'Contributor not found.');
        }

        if ($raw_token === '') {
            $issued = caes_issue_password_reset_token($contributor_id);

            if (is_wp_error($issued)) {
                return $issued;
            }

            $raw_token = $issued['raw_token'];
        }

        if (!function_exists('caes_build_password_reset_email_content')) {
            return new WP_Error('caes_email_template_missing', 'Email template helpers are unavailable.');
        }

        $reset_url     = caes_get_password_reset_url($raw_token, $contributor->email);
        $email_content = caes_build_password_reset_email_content($contributor->display_name, $reset_url);
        $sent          = caes_send_transactional_email(
            $contributor->email,
            $email_content['subject'],
            $email_content['html_body']
        );

        if (is_wp_error($sent)) {
            caes_log_transactional_email_debug($sent->get_error_code());

            return new WP_Error('caes_password_reset_email_failed', 'Failed to send password reset email.');
        }

        if ($sent !== true) {
            return new WP_Error('caes_password_reset_email_failed', 'Failed to send password reset email.');
        }

        return true;
    }
}

if (!function_exists('caes_reset_contributor_password_with_token')) {
    function caes_reset_contributor_password_with_token($email, $raw_token, $password) {
        global $wpdb;

        $email     = sanitize_email((string) $email);
        $raw_token = sanitize_text_field((string) $raw_token);

        if (!is_email($email) || $raw_token === '') {
            return new WP_Error('TOKEN_INVALID', 'Password reset token is invalid.', array('status' => 400));
        }

        if (!is_string($password) || strlen($password) < 8) {
            return new WP_Error(
                'INVALID_PASSWORD',
                'Password must be at least 8 characters.',
                array('status' => 400)
            );
        }

        $contributor = caes_get_contributor_auth_record_by_email($email);

        if (empty($contributor)) {
            return new WP_Error('TOKEN_INVALID', 'Password reset token is invalid.', array('status' => 400));
        }

        $stored_hash = sanitize_text_field((string) ($contributor->password_reset_token_hash ?? ''));
        $token_hash  = caes_hash_password_reset_token($raw_token);

        if ($stored_hash === '' || !hash_equals($stored_hash, $token_hash)) {
            return new WP_Error('TOKEN_INVALID', 'Password reset token is invalid.', array('status' => 400));
        }

        if (caes_is_password_reset_token_expired($contributor->password_reset_expires_at)) {
            return new WP_Error('TOKEN_EXPIRED', 'Password reset token has expired.', array('status' => 400));
        }

        $now     = current_time('mysql');
        $updated = $wpdb->update(
            caes_get_contributors_table_name(),
            array(
                'password_hash'             => wp_hash_password($password),
                'password_reset_token_hash' => null,
                'password_reset_expires_at' => null,
                'password_reset_sent_at'    => null,
                'updated_at'                => $now,
            ),
            array('id' => (int) $contributor->id),
            array('%s', '%s', '%s', '%s', '%s'),
            array('%d')
        );

        if ($updated === false) {
            return new WP_Error('PASSWORD_RESET_FAILED', 'Failed to reset password.', array('status' => 500));
        }

        caes_revoke_all_contributor_sessions((int) $contributor->id);

        return array(
            'success' => true,
            'message' => 'Password reset successfully.',
        );
    }
}

if (!function_exists('caes_auth_forgot_password')) {
    function caes_auth_forgot_password(WP_REST_Request $request) {
        $email = sanitize_email($request->get_param('email'));

        if (is_email($email)) {
            $rate_limited = caes_enforce_auth_rate_limit('forgot_password', $email, 5, HOUR_IN_SECONDS);

            if ($rate_limited instanceof WP_REST_Response) {
                return $rate_limited;
            }

            $contributor = caes_get_contributor_auth_record_by_email($email);

            if (!empty($contributor)) {
                $result = caes_send_password_reset_email((int) $contributor->id);

                if (is_wp_error($result)) {
                    caes_log_transactional_email_debug($result->get_error_code());
                }
            }
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'If an account exists for that email address, a password reset link has been sent.',
        ), 200);
    }
}

if (!function_exists('caes_auth_reset_password')) {
    function caes_auth_reset_password(WP_REST_Request $request) {
        $params   = function_exists('caes_get_request_merged_params')
            ? caes_get_request_merged_params($request)
            : array();
        $email    = sanitize_email((string) ($params['email'] ?? $request->get_param('email') ?? ''));
        $token    = sanitize_text_field((string) ($params['token'] ?? $request->get_param('token') ?? ''));
        $password = $params['password'] ?? $request->get_param('password');
        $result   = caes_reset_contributor_password_with_token($email, $token, $password);

        if (is_wp_error($result)) {
            return new WP_REST_Response(array(
                'success' => false,
                'code'    => $result->get_error_code(),
                'message' => $result->get_error_message(),
            ), (int) ($result->get_error_data()['status'] ?? 400));
        }

        return new WP_REST_Response($result, 200);
    }
}
