<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_contributor_email_meta_keys')) {
    function caes_get_contributor_email_meta_keys() {
        return array(
            'caes_email_verified'                 => 'email_verified',
            'caes_email_verified_at'              => 'email_verified_at',
            'caes_email_verification_token_hash'  => 'verification_token_hash',
            'caes_email_verification_expires'     => 'verification_expires_at',
            'caes_email_verification_sent_at'     => 'verification_sent_at',
        );
    }
}

if (!function_exists('caes_get_contributor_auth_record')) {
    function caes_get_contributor_auth_record($contributor_id) {
        global $wpdb;

        $contributor_id = absint($contributor_id);

        if ($contributor_id <= 0) {
            return null;
        }

        return $wpdb->get_row(
            $wpdb->prepare(
                'SELECT id, email, display_name, password_hash, role, status, email_verified, verification_token,
                        verification_token_hash, verification_expires_at, verification_sent_at, email_verified_at,
                        password_reset_token_hash, password_reset_expires_at, password_reset_sent_at,
                        approved_at, last_login, created_at, updated_at
                 FROM ' . caes_get_contributors_table_name() . ' WHERE id = %d',
                $contributor_id
            )
        );
    }
}

if (!function_exists('caes_get_contributor_auth_record_by_email')) {
    function caes_get_contributor_auth_record_by_email($email) {
        global $wpdb;

        $email = sanitize_email((string) $email);

        if (!is_email($email)) {
            return null;
        }

        return $wpdb->get_row(
            $wpdb->prepare(
                'SELECT id, email, display_name, password_hash, role, status, email_verified, verification_token,
                        verification_token_hash, verification_expires_at, verification_sent_at, email_verified_at,
                        password_reset_token_hash, password_reset_expires_at, password_reset_sent_at,
                        approved_at, last_login, created_at, updated_at
                 FROM ' . caes_get_contributors_table_name() . ' WHERE email = %s',
                $email
            )
        );
    }
}

if (!function_exists('caes_get_contributor_email_meta')) {
    function caes_get_contributor_email_meta($contributor_id, $meta_key) {
        $contributor = caes_get_contributor_auth_record($contributor_id);
        $map         = caes_get_contributor_email_meta_keys();

        if (empty($contributor) || !isset($map[$meta_key])) {
            return null;
        }

        $column = $map[$meta_key];
        $value  = $contributor->{$column} ?? null;

        if ($meta_key === 'caes_email_verified') {
            return (int) $value === 1;
        }

        return $value;
    }
}

if (!function_exists('caes_update_contributor_email_meta')) {
    function caes_update_contributor_email_meta($contributor_id, $meta_key, $meta_value) {
        global $wpdb;

        $contributor_id = absint($contributor_id);
        $map            = caes_get_contributor_email_meta_keys();

        if ($contributor_id <= 0 || !isset($map[$meta_key])) {
            return false;
        }

        if ($meta_key === 'caes_email_verified') {
            $meta_value = !empty($meta_value) ? 1 : 0;
        } else {
            $meta_value = $meta_value === null || $meta_value === '' ? null : $meta_value;
        }

        $updated = $wpdb->update(
            caes_get_contributors_table_name(),
            array(
                $map[$meta_key] => $meta_value,
                'updated_at'    => current_time('mysql'),
            ),
            array('id' => $contributor_id),
            array('%s'),
            array('%d')
        );

        return $updated !== false;
    }
}

if (!function_exists('caes_is_email_verified')) {
    function caes_is_email_verified($contributor) {
        if (empty($contributor)) {
            return false;
        }

        if (is_numeric($contributor)) {
            return (bool) caes_get_contributor_email_meta(absint($contributor), 'caes_email_verified');
        }

        return (int) ($contributor->email_verified ?? 0) === 1;
    }
}

if (!function_exists('caes_generate_verification_token')) {
    function caes_generate_verification_token() {
        if (function_exists('wp_generate_password')) {
            return wp_generate_password(48, false, false);
        }

        return bin2hex(random_bytes(24));
    }
}

if (!function_exists('caes_hash_verification_token')) {
    function caes_hash_verification_token($raw_token) {
        return hash_hmac('sha256', (string) $raw_token, wp_salt('caes_email_verification'));
    }
}

if (!function_exists('caes_get_verification_token_expiry_datetime')) {
    function caes_get_verification_token_expiry_datetime() {
        return gmdate('Y-m-d H:i:s', time() + DAY_IN_SECONDS);
    }
}

if (!function_exists('caes_is_verification_token_expired')) {
    function caes_is_verification_token_expired($expires_at) {
        if (empty($expires_at)) {
            return true;
        }

        $expires_timestamp = strtotime((string) $expires_at . ' UTC');

        return $expires_timestamp === false || $expires_timestamp < time();
    }
}

if (!function_exists('caes_issue_email_verification_token')) {
    function caes_issue_email_verification_token($contributor_id) {
        global $wpdb;

        $contributor_id = absint($contributor_id);
        $contributor    = caes_get_contributor_auth_record($contributor_id);

        if (empty($contributor)) {
            return new WP_Error('caes_contributor_not_found', 'Contributor not found.');
        }

        $raw_token  = caes_generate_verification_token();
        $token_hash = caes_hash_verification_token($raw_token);
        $now        = current_time('mysql');
        $expires_at = caes_get_verification_token_expiry_datetime();

        $updated = $wpdb->update(
            caes_get_contributors_table_name(),
            array(
                'verification_token_hash' => $token_hash,
                'verification_token'      => null,
                'verification_expires_at' => $expires_at,
                'verification_sent_at'    => $now,
                'updated_at'              => $now,
            ),
            array('id' => $contributor_id),
            array('%s', '%s', '%s', '%s', '%s'),
            array('%d')
        );

        if ($updated === false) {
            return new WP_Error('caes_verification_token_failed', 'Failed to create verification token.');
        }

        return array(
            'raw_token'  => $raw_token,
            'expires_at' => $expires_at,
            'sent_at'    => $now,
        );
    }
}

if (!function_exists('caes_send_verification_email')) {
    function caes_send_verification_email($contributor_id, $raw_token = '') {
        $contributor = caes_get_contributor_auth_record($contributor_id);

        if (empty($contributor)) {
            return new WP_Error('caes_contributor_not_found', 'Contributor not found.');
        }

        if ($raw_token === '') {
            $issued = caes_issue_email_verification_token($contributor_id);

            if (is_wp_error($issued)) {
                return $issued;
            }

            $raw_token = $issued['raw_token'];
        }

        if (!function_exists('caes_build_verification_email_content')) {
            return new WP_Error('caes_email_template_missing', 'Email template helpers are unavailable.');
        }

        $verification_url = caes_get_email_verification_url($raw_token, $contributor->email);
        $email_content    = caes_build_verification_email_content($contributor->display_name, $verification_url);
        $sent = caes_send_transactional_email(
            $contributor->email,
            $email_content['subject'],
            $email_content['html_body']
        );

        if (is_wp_error($sent)) {
            caes_log_transactional_email_debug($sent->get_error_code());

            return new WP_Error('caes_verification_email_failed', 'Failed to send verification email.');
        }

        if ($sent !== true) {
            return new WP_Error('caes_verification_email_failed', 'Failed to send verification email.');
        }

        return true;
    }
}

if (!function_exists('caes_can_resend_verification_email')) {
    function caes_can_resend_verification_email($contributor) {
        if (empty($contributor) || caes_is_email_verified($contributor)) {
            return false;
        }

        $sent_at = (string) ($contributor->verification_sent_at ?? '');

        if ($sent_at === '') {
            return true;
        }

        $sent_timestamp = strtotime($sent_at);

        if ($sent_timestamp === false) {
            return true;
        }

        return (current_time('timestamp') - $sent_timestamp) >= 120;
    }
}

if (!function_exists('caes_resend_verification_email')) {
    function caes_resend_verification_email($email) {
        $email       = sanitize_email((string) $email);
        $contributor = caes_get_contributor_auth_record_by_email($email);

        if (empty($contributor) || caes_is_email_verified($contributor)) {
            return true;
        }

        if (!caes_can_resend_verification_email($contributor)) {
            return new WP_Error(
                'RATE_LIMITED',
                'Please wait before requesting another verification email.',
                array('status' => 429)
            );
        }

        if (caes_is_rate_limited('resend_verification', $email, 5, HOUR_IN_SECONDS)) {
            return new WP_Error(
                'RATE_LIMITED',
                'Too many attempts. Please try again later.',
                array('status' => 429)
            );
        }

        caes_record_rate_limit_attempt('resend_verification', $email, HOUR_IN_SECONDS);

        return caes_send_verification_email((int) $contributor->id);
    }
}

if (!function_exists('caes_verify_email_legacy_by_token')) {
    function caes_verify_email_legacy_by_token($raw_token) {
        global $wpdb;

        $raw_token = sanitize_text_field((string) $raw_token);

        if ($raw_token === '') {
            return new WP_Error('TOKEN_INVALID', 'Verification token is invalid.', array('status' => 400));
        }

        $table_name  = caes_get_contributors_table_name();
        $token_hash  = caes_hash_verification_token($raw_token);
        $contributor = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT id, email, email_verified, verification_token, verification_token_hash, verification_expires_at
                 FROM {$table_name}
                 WHERE verification_token = %s OR verification_token_hash = %s
                 LIMIT 1",
                $raw_token,
                $token_hash
            )
        );

        if (empty($contributor)) {
            return new WP_Error('TOKEN_INVALID', 'Verification token is invalid.', array('status' => 400));
        }

        return caes_verify_email_token($raw_token, $contributor->email);
    }
}

if (!function_exists('caes_verify_email_token')) {
    function caes_verify_email_token($raw_token, $email) {
        $raw_token   = sanitize_text_field((string) $raw_token);
        $email       = sanitize_email((string) $email);
        $contributor = caes_get_contributor_auth_record_by_email($email);

        if ($raw_token === '' || !is_email($email) || empty($contributor)) {
            return new WP_Error('TOKEN_INVALID', 'Verification token is invalid.', array('status' => 400));
        }

        if (caes_is_email_verified($contributor)) {
            return array(
                'success'  => true,
                'verified' => true,
                'message'  => 'Email address is already verified.',
            );
        }

        $stored_hash = sanitize_text_field((string) ($contributor->verification_token_hash ?? ''));
        $legacy_token = sanitize_text_field((string) ($contributor->verification_token ?? ''));
        $token_hash  = caes_hash_verification_token($raw_token);
        $token_valid = false;

        if ($stored_hash !== '' && hash_equals($stored_hash, $token_hash)) {
            $token_valid = true;
        } elseif ($legacy_token !== '' && hash_equals($legacy_token, $raw_token)) {
            $token_valid = true;
        }

        if (!$token_valid) {
            return new WP_Error('TOKEN_INVALID', 'Verification token is invalid.', array('status' => 400));
        }

        if (caes_is_verification_token_expired($contributor->verification_expires_at) && $legacy_token === '') {
            return new WP_Error('TOKEN_EXPIRED', 'Verification token has expired.', array('status' => 400));
        }

        return caes_activate_verified_contributor_email((int) $contributor->id);
    }
}

if (!function_exists('caes_activate_verified_contributor_email')) {
    function caes_activate_verified_contributor_email($contributor_id) {
        global $wpdb;

        $contributor_id = absint($contributor_id);
        $contributor    = caes_get_contributor_auth_record($contributor_id);

        if (empty($contributor)) {
            return new WP_Error('caes_verification_failed', 'Failed to verify email address.', array('status' => 500));
        }

        $was_unverified = (int) ($contributor->email_verified ?? 0) !== 1;

        if (!$was_unverified) {
            return array(
                'success'  => true,
                'verified' => true,
                'message'  => 'Email address is already verified.',
            );
        }

        $now        = current_time('mysql');
        $table_name = caes_get_contributors_table_name();
        $updated    = $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$table_name}
                 SET email_verified = 1,
                     email_verified_at = %s,
                     status = 'pending_approval',
                     verification_token = NULL,
                     verification_token_hash = NULL,
                     verification_expires_at = NULL,
                     updated_at = %s
                 WHERE id = %d AND email_verified = 0",
                $now,
                $now,
                $contributor_id
            )
        );

        if ($updated === false) {
            return new WP_Error('caes_verification_failed', 'Failed to verify email address.', array('status' => 500));
        }

        if ((int) $updated === 0) {
            return array(
                'success'  => true,
                'verified' => true,
                'message'  => 'Email address is already verified.',
            );
        }

        caes_send_email_verified_pending_approval_notification($contributor_id);

        return array(
            'success'  => true,
            'verified' => true,
            'message'  => 'Email verified successfully.',
        );
    }
}

if (!function_exists('caes_auth_register_contributor')) {
    function caes_auth_register_contributor(WP_REST_Request $request) {
        global $wpdb;

        $email        = sanitize_email($request->get_param('email'));
        $display_name = sanitize_text_field($request->get_param('display_name'));
        $password     = $request->get_param('password');

        if (!is_email($email)) {
            return new WP_Error(
                'rest_invalid_email',
                'A valid email address is required.',
                array('status' => 400)
            );
        }

        if ($display_name === '') {
            return new WP_Error(
                'rest_missing_display_name',
                'Display name is required.',
                array('status' => 400)
            );
        }

        if (!is_string($password) || strlen($password) < 8) {
            return new WP_Error(
                'rest_invalid_password',
                'Password must be at least 8 characters.',
                array('status' => 400)
            );
        }

        $rate_limited = caes_enforce_auth_rate_limit('register', $email, 5, HOUR_IN_SECONDS);

        if ($rate_limited instanceof WP_REST_Response) {
            return $rate_limited;
        }

        $table_name = caes_get_contributors_table_name();
        $existing   = $wpdb->get_var(
            $wpdb->prepare("SELECT id FROM $table_name WHERE email = %s", $email)
        );

        if (!empty($existing)) {
            return new WP_Error(
                'rest_email_exists',
                'This email is already registered.',
                array('status' => 409)
            );
        }

        $now      = current_time('mysql');
        $inserted = $wpdb->insert(
            $table_name,
            array(
                'email'                   => $email,
                'password_hash'           => wp_hash_password($password),
                'display_name'            => $display_name,
                'role'                    => 'contributor',
                'status'                  => 'pending_email',
                'email_verified'          => 0,
                'verification_token'      => null,
                'verification_token_hash' => null,
                'verification_expires_at' => null,
                'verification_sent_at'    => null,
                'email_verified_at'       => null,
                'created_at'              => $now,
                'updated_at'              => $now,
            ),
            array('%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
        );

        if (!$inserted) {
            return new WP_Error(
                'rest_registration_failed',
                'Failed to create contributor registration.',
                array('status' => 500)
            );
        }

        $contributor_id = (int) $wpdb->insert_id;
        $email_result   = caes_send_verification_email($contributor_id);

        if (is_wp_error($email_result)) {
            return new WP_Error(
                'rest_verification_email_failed',
                'Account created, but the verification email could not be sent. Please try resending verification.',
                array('status' => 500)
            );
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Please verify your email address.',
            'contributor' => array(
                'id'             => $contributor_id,
                'email'          => $email,
                'display_name'   => $display_name,
                'status'         => 'pending_email',
                'email_verified' => false,
            ),
        ), 201);
    }
}

if (!function_exists('caes_auth_verify_email')) {
    function caes_auth_verify_email(WP_REST_Request $request) {
        $params = function_exists('caes_get_request_merged_params')
            ? caes_get_request_merged_params($request)
            : array();
        $token  = sanitize_text_field((string) ($params['token'] ?? $request->get_param('token') ?? ''));
        $email  = sanitize_email((string) ($params['email'] ?? $request->get_param('email') ?? ''));

        if ($token === '') {
            return new WP_REST_Response(array(
                'success' => false,
                'code'    => 'TOKEN_INVALID',
                'message' => 'Verification token is required.',
            ), 400);
        }

        $rate_identifier = $email !== ''
            ? $email
            : 'token_' . hash('sha256', $token);
        $rate_limited    = caes_enforce_auth_rate_limit('verify_email', $rate_identifier, 15, HOUR_IN_SECONDS);

        if ($rate_limited instanceof WP_REST_Response) {
            return $rate_limited;
        }

        $result = $email !== ''
            ? caes_verify_email_token($token, $email)
            : caes_verify_email_legacy_by_token($token);

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

if (!function_exists('caes_auth_resend_verification')) {
    function caes_auth_resend_verification(WP_REST_Request $request) {
        $email  = sanitize_email($request->get_param('email'));
        $result = caes_resend_verification_email($email);

        if (is_wp_error($result)) {
            $code = $result->get_error_code();

            if ($code === 'caes_resend_rate_limited') {
                $code = 'RATE_LIMITED';
            }

            return new WP_REST_Response(array(
                'success' => false,
                'code'    => $code,
                'message' => $result->get_error_message(),
            ), (int) ($result->get_error_data()['status'] ?? 429));
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'If the account exists and is unverified, a verification email has been sent.',
        ), 200);
    }
}

if (!function_exists('caes_auth_login_contributor')) {
    function caes_auth_login_contributor(WP_REST_Request $request) {
        global $wpdb;

        $email    = sanitize_email($request->get_param('email'));
        $password = $request->get_param('password');

        if (!is_email($email)) {
            return new WP_Error(
                'rest_invalid_email',
                'A valid email address is required.',
                array('status' => 400)
            );
        }

        if (!is_string($password) || $password === '') {
            return new WP_Error(
                'rest_missing_password',
                'Password is required.',
                array('status' => 400)
            );
        }

        $rate_limited = caes_enforce_auth_rate_limit('login', $email, 10, 15 * MINUTE_IN_SECONDS);

        if ($rate_limited instanceof WP_REST_Response) {
            return $rate_limited;
        }

        $contributor = caes_get_contributor_auth_record_by_email($email);

        if (empty($contributor) || !wp_check_password($password, $contributor->password_hash)) {
            return new WP_Error(
                'rest_invalid_credentials',
                'Invalid email or password.',
                array('status' => 401)
            );
        }

        if (!caes_is_email_verified($contributor)) {
            return new WP_REST_Response(array(
                'success'               => false,
                'code'                  => 'EMAIL_NOT_VERIFIED',
                'canResendVerification' => true,
                'message'               => 'Please verify your email address before logging in.',
            ), 403);
        }

        if ($contributor->status === 'rejected') {
            return new WP_REST_Response(array(
                'success' => false,
                'code'    => 'ACCOUNT_REJECTED',
                'message' => 'Your contributor account was not approved.',
            ), 403);
        }

        if ($contributor->status !== 'approved') {
            return new WP_REST_Response(array(
                'success' => false,
                'code'    => 'PENDING_APPROVAL',
                'message' => 'Your account is awaiting administrator approval.',
            ), 403);
        }

        $token             = bin2hex(random_bytes(32));
        $token_hash        = caes_hash_session_token($token);
        $now               = current_time('mysql');
        $expires_timestamp = current_time('timestamp') + (7 * DAY_IN_SECONDS);
        $expires_at        = date('Y-m-d H:i:s', $expires_timestamp);
        $sessions_table    = $wpdb->prefix . 'caes_sessions';
        $inserted          = $wpdb->insert(
            $sessions_table,
            array(
                'contributor_id' => (int) $contributor->id,
                'token_hash'     => $token_hash,
                'expires_at'     => $expires_at,
                'created_at'     => $now,
            ),
            array('%d', '%s', '%s', '%s')
        );

        if (!$inserted) {
            return new WP_Error(
                'rest_login_failed',
                'Failed to create login session.',
                array('status' => 500)
            );
        }

        $wpdb->update(
            caes_get_contributors_table_name(),
            array(
                'last_login' => $now,
                'updated_at' => $now,
            ),
            array('id' => (int) $contributor->id),
            array('%s', '%s'),
            array('%d')
        );

        $fresh_contributor = caes_get_contributor_auth_record((int) $contributor->id);

        if (!empty($fresh_contributor)) {
            $contributor = $fresh_contributor;
        }

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Login successful.',
            'token'   => $token,
            'expires_at' => $expires_at,
            'contributor' => array(
                'id'           => (int) $contributor->id,
                'email'        => $contributor->email,
                'display_name' => $contributor->display_name,
                'status'       => $contributor->status,
                'role'         => caes_get_contributor_role($contributor),
            ),
        ), 200);
    }
}
