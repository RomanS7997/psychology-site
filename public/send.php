<?php
// Приём заявок с форм сайта: запись, всплывающая форма, «Контакты», тесты.
// Заявка сразу уходит письмом психологу и на сервере не остаётся.
//
// До 25.11.2026 формы слали всё на formsubmit.co. Форма там так и не была
// активирована: сервис отвечал «needs Activation», каждая заявка терялась,
// а человек ждал ответа до минуты. Теперь письмо отправляет сам хостинг
// (Beget): данные не уходят за рубеж, ждать не нужно.
//
// Ответ — JSON {"success":"true"|"false"}: формы на сайте написаны под этот
// вид ещё со времён formsubmit и судят об успехе по полю success.

// Предупреждение PHP в ответе испортило бы JSON, и форма показала бы ошибку
// при уже отправленном письме. В журнал сервера они пишутся как обычно.
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const MAIL_TO = 'lyapina_sorokina@mail.ru';
const MAIL_FROM = 'noreply@julialyapina.ru';
const SITE_HOSTS = array('julialyapina.ru', 'www.julialyapina.ru');

const MAX_BODY = 32768;    // байт; самая длинная форма — тест с ответами, ~3 КБ
const MAX_FIELDS = 30;
const MAX_VALUE = 4000;    // символов в одном поле

if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
}

function reply($ok, $code, $extra = array())
{
    http_response_code($code);
    echo json_encode(array('success' => $ok ? 'true' : 'false') + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

function cut($s, $len)
{
    return function_exists('mb_substr') ? mb_substr($s, 0, $len) : substr($s, 0, $len);
}

function from_our_site($url)
{
    if (!is_string($url) || $url === '') {
        return false;
    }
    $host = parse_url($url, PHP_URL_HOST);
    return is_string($host) && in_array(strtolower($host), SITE_HOSTS, true);
}

// Не больше $limit принятых заявок за $window секунд на ключ. Если хранилище
// недоступно — пропускаем: потерять заявку хуже, чем пропустить спам.
function within_limit($key, $limit, $window)
{
    $dir = sys_get_temp_dir() . '/julialyapina_forms';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $fh = @fopen($dir . '/' . sha1($key) . '.json', 'c+');
    if (!$fh) {
        return true;
    }
    flock($fh, LOCK_EX);
    $now = time();
    $times = json_decode(stream_get_contents($fh), true);
    $fresh = array();
    if (is_array($times)) {
        foreach ($times as $t) {
            if (is_int($t) && $t > $now - $window) {
                $fresh[] = $t;
            }
        }
    }
    $ok = count($fresh) < $limit;
    if ($ok) {
        $fresh[] = $now;
    }
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($fresh));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $ok;
}

function client_key()
{
    // За Beget перед Apache стоит nginx. Если REMOTE_ADDR оказался адресом
    // самого прокси, у всех посетителей был бы один общий счётчик.
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        foreach (array('HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR') as $h) {
            if (!empty($_SERVER[$h])) {
                $ip = trim(explode(',', $_SERVER[$h])[0]);
                break;
            }
        }
    }
    return 'ip:' . $ip;
}

// Одним куском, без переноса строк внутри заголовка: перенос в теме письма
// mail() на части серверов понимает как конец заголовков.
function mime_header($s)
{
    return '=?UTF-8?B?' . base64_encode($s) . '?=';
}

// Убирает управляющие символы. null — если в строке битая кодировка UTF-8.
function clean($s, $keepNewlines)
{
    $s = str_replace("\r\n", "\n", $s);
    $re = $keepNewlines ? '/[\x00-\x09\x0B-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]+/u';
    $out = preg_replace($re, $keepNewlines ? '' : ' ', $s);
    return $out === null ? null : trim($out);
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';

// Проверка после выкладки открывает этот адрес обычным GET и ждёт 200.
// Ответ «ready» заодно доказывает, что PHP исполняется, а не отдаётся текстом.
if ($method === 'GET' || $method === 'HEAD') {
    reply(false, 200, array('ready' => true));
}
if ($method !== 'POST') {
    header('Allow: GET, POST');
    reply(false, 405);
}

// Только со страниц самого сайта. Браузер всегда ставит Origin у POST-запроса;
// без него смотрим на Referer.
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
if ($origin !== '' ? !from_our_site($origin) : !from_our_site($referer)) {
    reply(false, 403);
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($raw === false || strlen($raw) > MAX_BODY) {
    reply(false, 413);
}
$type = isset($_SERVER['CONTENT_TYPE']) ? strtolower($_SERVER['CONTENT_TYPE']) : '';
$data = strpos($type, 'application/json') !== false ? json_decode($raw, true) : $_POST;
if (!is_array($data)) {
    reply(false, 400);
}

// Скрытое поле-ловушка: человек его не видит и не заполняет, бот заполняет.
// Боту отвечаем «принято», чтобы он не начал подбирать обход.
if (!empty($data['_honey'])) {
    reply(true, 200);
}

$subject = isset($data['_subject']) && is_string($data['_subject']) ? clean($data['_subject'], false) : '';
$subject = $subject !== null && $subject !== '' ? cut($subject, 120) : 'Заявка с сайта julialyapina.ru';

$lines = array();
$replyTo = '';
$filled = 0;
foreach ($data as $key => $value) {
    if (!is_string($key) || $key === '' || $key[0] === '_') {
        continue;
    }
    if (count($lines) >= MAX_FIELDS) {
        break;
    }
    if (!is_scalar($value)) {
        continue;
    }
    // Переводы строк в комментарии оставляем, прочие управляющие символы — нет.
    $key = clean($key, false);
    $value = clean((string) $value, true);
    if ($key === null || $key === '' || $value === null) {
        continue;
    }
    $key = cut($key, 60);
    $value = cut($value, MAX_VALUE);
    if ($value !== '' && $value !== '—') {
        $filled++;
    }
    if (strtolower($key) === 'email' && filter_var($value, FILTER_VALIDATE_EMAIL)) {
        $replyTo = $value;
    }
    $lines[] = $key . ': ' . (strpos($value, "\n") !== false ? "\n" . $value : $value);
}
if ($filled === 0) {
    reply(false, 400);
}

// Пять принятых заявок за 10 минут с одного адреса и сто в час на весь сайт.
// Живому человеку этого не достичь, а поток спама в почту останавливает.
if (!within_limit(client_key(), 5, 600) || !within_limit('all', 100, 3600)) {
    reply(false, 429);
}

$when = new DateTime('now', new DateTimeZone('Europe/Moscow'));
$body = $subject . "\n\n" . implode("\n", $lines)
    . "\n\n—\nОтправлено с сайта julialyapina.ru " . $when->format('d.m.Y H:i') . " по Москве.\n";

$headers = array(
    'From: ' . mime_header('Сайт julialyapina.ru') . ' <' . MAIL_FROM . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
);
if ($replyTo !== '') {
    $headers[] = 'Reply-To: <' . $replyTo . '>';
}

// -f задаёт адрес отправителя в конверте письма: с ним проверка SPF домена
// julialyapina.ru («redirect=beget.com») проходит, и письмо не летит в спам.
$sent = mail(
    MAIL_TO,
    mime_header($subject),
    chunk_split(base64_encode($body), 76, "\n"),
    implode("\r\n", $headers),
    '-f' . MAIL_FROM
);

if (!$sent) {
    error_log('send.php: mail() не отправил заявку');
    reply(false, 500);
}
reply(true, 200);
