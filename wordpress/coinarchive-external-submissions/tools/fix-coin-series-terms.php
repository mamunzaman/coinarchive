<?php
/**
 * One-time coin_series term cleanup.
 * Usage: wp eval-file wp-content/plugins/coinarchive-external-submissions/tools/fix-coin-series-terms.php
 */

if (!defined('ABSPATH')) {
    exit(1);
}

$canonical_en_name = 'Unity and Justice and Freedom';
$canonical_en_slug = 'unity-and-justice-and-freedom';
$canonical_de_name = 'Einigkeit und Recht und Freiheit';

$bad_term_ids = array(197, 199);
$legacy_en_id   = 161;
$legacy_de_id   = 185;

function caes_fix_reassign_posts_to_term($from_term_id, $to_term_id) {
    $from_term_id = absint($from_term_id);
    $to_term_id   = absint($to_term_id);

    if ($from_term_id <= 0 || $to_term_id <= 0 || $from_term_id === $to_term_id) {
        return 0;
    }

    $posts = get_posts(array(
        'post_type'      => 'coin',
        'posts_per_page' => -1,
        'fields'         => 'ids',
        'tax_query'      => array(
            array(
                'taxonomy' => 'coin_series',
                'field'    => 'term_id',
                'terms'    => array($from_term_id),
            ),
        ),
    ));

    $moved = 0;

    foreach ($posts as $post_id) {
        $current = wp_get_post_terms($post_id, 'coin_series', array('fields' => 'ids'));

        if (is_wp_error($current)) {
            continue;
        }

        $next = array();

        foreach ($current as $term_id) {
            $term_id = absint($term_id);

            if ($term_id === $from_term_id) {
                $next[] = $to_term_id;
                continue;
            }

            if (in_array($term_id, array(197, 199), true)) {
                $next[] = $to_term_id;
                continue;
            }

            $next[] = $term_id;
        }

        $next = array_values(array_unique(array_filter($next)));

        wp_set_object_terms($post_id, $next, 'coin_series', false);
        $moved++;
    }

    return $moved;
}

$en_term = get_term($legacy_en_id, 'coin_series');

if (!$en_term || is_wp_error($en_term)) {
    $insert = wp_insert_term($canonical_en_name, 'coin_series', array('slug' => $canonical_en_slug));

    if (is_wp_error($insert)) {
        WP_CLI::error($insert->get_error_message());
    }

    $legacy_en_id = absint($insert['term_id']);
    WP_CLI::log('Created EN term ID ' . $legacy_en_id);
} else {
    $updated = wp_update_term($legacy_en_id, 'coin_series', array(
        'name' => $canonical_en_name,
        'slug' => $canonical_en_slug,
    ));

    if (is_wp_error($updated)) {
        WP_CLI::error('EN update failed: ' . $updated->get_error_message());
    }

    WP_CLI::log('Updated EN term ID ' . $legacy_en_id);
}

$de_term = get_term($legacy_de_id, 'coin_series');

if ($de_term && !is_wp_error($de_term)) {
    $de_slug = sanitize_title($canonical_de_name);
    $updated = wp_update_term($legacy_de_id, 'coin_series', array(
        'name' => $canonical_de_name,
        'slug' => $de_slug,
    ));

    if (is_wp_error($updated)) {
        WP_CLI::warning('DE update failed: ' . $updated->get_error_message());
    } else {
        WP_CLI::log('Updated DE term ID ' . $legacy_de_id);
    }

    if (function_exists('pll_set_term_language')) {
        pll_set_term_language($legacy_de_id, 'de');
        pll_set_term_language($legacy_en_id, 'en');

        if (function_exists('pll_save_term_translations')) {
            pll_save_term_translations(array(
                'en' => $legacy_en_id,
                'de' => $legacy_de_id,
            ));
        }
    }
}

$moved = 0;

foreach ($bad_term_ids as $bad_id) {
    $moved += caes_fix_reassign_posts_to_term($bad_id, $legacy_en_id);
}

WP_CLI::log('Reassigned posts from bad terms: ' . $moved);

foreach ($bad_term_ids as $bad_id) {
    $term = get_term($bad_id, 'coin_series');

    if (!$term || is_wp_error($term)) {
        continue;
    }

    if ((int) $term->count > 0) {
        WP_CLI::warning('Skipped delete for term ' . $bad_id . ' (still has count ' . $term->count . ')');
        continue;
    }

    $deleted = wp_delete_term($bad_id, 'coin_series');

    if (is_wp_error($deleted)) {
        WP_CLI::warning('Delete failed for ' . $bad_id . ': ' . $deleted->get_error_message());
    } else {
        WP_CLI::log('Deleted bad term ID ' . $bad_id . ' (' . $term->name . ')');
    }
}

WP_CLI::success('coin_series cleanup complete.');
