<?php
// Временный файл. Нужен ровно на одну задачу: узнать, как именно Beget
// сообщает Apache, пришёл запрос по http или по https. От этого зависит
// правило перенаправления в .htaccess — написанное наугад, оно кладёт сайт
// бесконечной петлёй.
//
// Печатает только признаки протокола. Ни путей, ни переменных окружения,
// ни настроек, ни phpinfo — ничего, что стоило бы прятать.
//
// УДАЛЯЕТСЯ сразу после проверки, вторым заходом выкладки.

header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$keys = [
    'HTTPS',
    'REQUEST_SCHEME',
    'SERVER_PORT',
    'HTTP_X_FORWARDED_PROTO',
    'HTTP_X_FORWARDED_SSL',
    'HTTP_X_FORWARDED_PROTOCOL',
    'HTTP_X_FORWARDED_PORT',
    'HTTP_FRONT_END_HTTPS',
];

foreach ($keys as $k) {
    echo $k . ' = ' . (isset($_SERVER[$k]) ? $_SERVER[$k] : '(нет)') . "\n";
}
echo "SERVER_SOFTWARE = " . (isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : '(нет)') . "\n";
echo "htaccess-works = yes\n";
