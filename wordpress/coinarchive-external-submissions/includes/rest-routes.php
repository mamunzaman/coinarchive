<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_register_rest_routes')) {
    function caes_register_rest_routes() {
        register_rest_route('coinarchive/v1', '/health', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_health_check',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/submit-coin', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_submit_coin',
            'permission_callback' => 'caes_verify_submission_access',
        ));

        register_rest_route('coinarchive/v1', '/auth/register', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_auth_register_contributor',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/auth/verify-email', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_auth_verify_email',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/auth/resend-verification', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_auth_resend_verification',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/auth/login', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_auth_login_contributor',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/auth/me', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_auth_get_current_contributor',
            'permission_callback' => 'caes_verify_contributor_token',
        ));

        register_rest_route('coinarchive/v1', '/auth/logout', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_auth_logout_contributor',
            'permission_callback' => 'caes_verify_bearer_session_exists',
        ));

        register_rest_route('coinarchive/v1', '/auth/forgot-password', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_auth_forgot_password',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/auth/reset-password', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_auth_reset_password',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/register', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_register_contributor',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/verify-email', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_verify_email',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/admin/approve-contributor', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_approve_contributor',
            'permission_callback' => 'caes_verify_api_key_or_admin_token',
        ));

        register_rest_route('coinarchive/v1', '/login', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_login_contributor',
            'permission_callback' => '__return_true',
        ));

        register_rest_route('coinarchive/v1', '/form-options', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_get_form_options',
            'permission_callback' => 'caes_verify_contributor_token',
        ));

        register_rest_route('coinarchive/v1', '/taxonomies', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_get_form_options',
            'permission_callback' => 'caes_verify_contributor_token',
        ));

        register_rest_route('coinarchive/v1', '/ai/descriptions', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_generate_ai_descriptions',
            'permission_callback' => 'caes_verify_contributor_token',
        ));

        register_rest_route('coinarchive/v1', '/duplicate-check', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_check_coin_duplicates',
            'permission_callback' => 'caes_verify_submission_access',
        ));

        register_rest_route('coinarchive/v1', '/my-submissions', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_get_my_submissions',
            'permission_callback' => 'caes_verify_contributor_token',
        ));

        register_rest_route('coinarchive/v1', '/my-submissions/(?P<id>\d+)', array(
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => 'caes_get_my_submission',
                'permission_callback' => 'caes_verify_contributor_token',
                'args'                => array(
                    'id' => array(
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ),
                ),
            ),
            array(
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => 'caes_delete_my_submission',
                'permission_callback' => 'caes_verify_contributor_token',
                'args'                => array(
                    'id' => array(
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ),
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/my-submissions/(?P<id>\d+)/activity', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_get_my_submission_activity',
            'permission_callback' => 'caes_verify_contributor_token',
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/submissions/(?P<id>\d+)', array(
            'methods'             => WP_REST_Server::DELETABLE,
            'callback'            => 'caes_delete_my_submission',
            'permission_callback' => 'caes_verify_contributor_token',
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/my-submissions/(?P<id>\d+)/update', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_update_my_submission',
            'permission_callback' => 'caes_verify_contributor_token',
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/admin/contributors', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_get_admin_contributors',
            'permission_callback' => 'caes_verify_admin_token',
        ));

        register_rest_route('coinarchive/v1', '/admin/reject-contributor', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_reject_contributor',
            'permission_callback' => 'caes_verify_api_key_or_admin_token',
        ));

        register_rest_route('coinarchive/v1', '/admin/stats', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_get_admin_stats',
            'permission_callback' => 'caes_verify_admin_token',
        ));

        register_rest_route('coinarchive/v1', '/admin/import-coins', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_import_admin_coins',
            'permission_callback' => 'caes_verify_admin_token',
        ));

        register_rest_route('coinarchive/v1', '/admin/submissions', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_get_admin_submissions',
            'permission_callback' => 'caes_verify_admin_token',
        ));

        register_rest_route('coinarchive/v1', '/admin/submissions/(?P<id>\d+)', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'caes_get_admin_submission',
            'permission_callback' => 'caes_verify_admin_token',
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/admin/submissions/(?P<id>\d+)/approve', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_approve_admin_submission',
            'permission_callback' => 'caes_verify_admin_token',
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/admin/submissions/(?P<id>\d+)/reject', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_reject_admin_submission',
            'permission_callback' => 'caes_verify_admin_token',
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/admin/submissions/(?P<id>\d+)/request-revision', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_request_admin_submission_revision',
            'permission_callback' => 'caes_verify_admin_token',
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/admin/submissions/(?P<id>\d+)/update', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_update_admin_submission',
            'permission_callback' => 'caes_verify_admin_token',
            'args'                => array(
                'id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('coinarchive/v1', '/admin/set-contributor-role', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'caes_set_contributor_role',
            'permission_callback' => 'caes_verify_api_key_or_admin_token',
        ));
    }
}

if (!function_exists('caes_health_check')) {
    function caes_health_check(WP_REST_Request $request) {
        return new WP_REST_Response(array(
            'success' => true,
            'plugin'  => 'CoinArchive External Submissions',
            'version' => CAES_VERSION,
        ), 200);
    }
}

add_action('rest_api_init', 'caes_register_rest_routes');
