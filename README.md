# 梵音殿 · OBENNO

A quiet Chinese Buddhist devotional site — a gilded hall with the seated Buddha, the Great Compassion Mantra chant, sutras in full text with pinyin, a daily practice, offerings, a lunar almanac, a glossary, plus an outline of the teaching and a short history of Buddhism. Free to visit, no account, no ads.

线上地址：https://www.obenno.com/ ｜ 托管：GitHub Pages + Cloudflare ｜ 主分支：`main`

## 目录结构

```
index.html          首页（全屏交互大殿，含藏经/功课/仪轨/次第/寺院/供养/历数/名相/纲要/史略十个锚点）
canon.html          藏经栏目页（三经一咒 + 二十九部全文经页索引）
practice.html       功课
rites.html          仪轨
path.html           次第
temple.html          寺院
offerings.html      供养
almanac.html        历数（农历朔望、六斋日、圣诞）
glossary.html       名相（全站检索与八十三条小词典）
basics.html        纲要（十门教理：三宝、四谛、八正道、十二因缘、五蕴、三法印、六度四摄、三十七道品、业与六道、涅槃与菩提心、戒定慧与止观、读经门径）
history.html        史略（佛陀与僧团、结集与部派、中观唯识、密教与印度佛教衰亡、汉地译经、隋唐八宗、宋元明清、近现代、南传与藏传、本站底本）
404.html            错误页
sw.js               Service Worker（页面网络优先、静态资源精确匹配缓存）
sitemap.xml         站点地图（40 条）
robots.txt          抓取规则（仅屏蔽 /_backup/）
llms.txt            AI 助手用的站点说明
manifest.json       Web App 清单
0712f55fa04b0f28d66c1b84bb6ababf.txt   IndexNow 公钥文件
sutra/*.html        29 部经文独立全文页（静态，共用 assets/sutra.css）
assets/             样式、脚本、字体、图片、分片经卷 JSON
```

## assets 说明

- `site.css` / `sutra.css` / `pages.css`：三套样式，分别服务首页、经文页、栏目页。
- `app.js`：首页交互与阅读器。按经加载：`loadText(id)` 逐部拉取 `/assets/texts/<id>.json`；检索索引改为**分片渐进加载**——首次搜索时按 6 部一批并发拉取分片，每批完成立即重绘结果（命中数由少到多逐批刷新），末批置完成态，不再整包下载 1.5MB 的 `texts.json`。名相词条在 `var TERMS` 中，现为八十三条（中文/英文/中文释义/英文释义四元组）。
- `texts.json`（约 1.5MB）：30 部经全文的历史合并副本，**当前已无代码引用**，纯占位遗留。
- `texts/*.json`：30 个分片（一部一文件），阅读器与检索索引都只加载它们。
- `noto-a0.woff2` / `noto-a1.woff2` / `noto-b0.woff2`：正文字体三切片（300 字重常用字、300 字重生僻字、600 字重标题数字）。生僻字面只在经文正文处经字体族回退链启用。
- `notoserifsc-subset.woff2`：旧版单文件字体（300 字重全字集），为兼容被缓存的旧 CSS 保留。
- `hall_gold_480/720/960/1280.webp`：殿门背景，按屏幕宽度分档加载。
- `buddha_seated.webp` 及 `_360/_480/_600`：佛像，配 `srcset`。

## 经文页的卷品目录

- `sutra/zl.html`（中论）：四卷二十七品目录，目录卡为药丸式卷链接 + 四列品目网格，每品可直跳。
- `sutra/lyj.html`（楞严）：十卷目录；本经无品目分章，目录卡改用 `toc juan-only` 简式并附一行说明。
- 目录不切段、不增删正文：只在边界字符偏移处插入 `<a class="anc" id="pN/jN"></a>`，段落结构与「共 332 节 / 485 节」口径不变；页顶加「↑ 回目录」。
- 锚点跳转需避让 62px 顶栏，故 `a.anc{scroll-margin-top:76px}` 写在 `sutra.css` 的 `TOC_CSS` 内；**该样式由生成脚本产出，手改 css 会在下次重跑时被覆盖**。

## 部署与缓存

1. 提交到 `main` 即由 GitHub Pages 发布，Cloudflare 在前。
2. GitHub Pages 对静态资源默认 `cache-control: max-age=86400`，因此**改 CSS/JS/字体时必须换版本号**（当前 `site.css?v=30`、`app.js?v=32`、`sutra.css?v=34`；经文页引用 v=34）。HTML 不能长缓存。
3. 改动上线后按需清 Cloudflare 缓存：`POST /client/v4/zones/<zone>/purge_cache`，body `{"files":[...]}`，单次不超过 30 条。
4. `sw.js` 的 `CACHE`（当前 `fxy-v30`）决定 Service Worker 缓存失效；导航请求走「网络优先、失败回落缓存」，静态资源「精确匹配缓存优先 + 后台更新」。
5. 注意：静态资源缓存必须用**精确匹配**（`caches.match(req)`，不可加 `ignoreSearch`），否则 `?v=` 版本号会被旧缓存吞掉，JS 改了也不生效；这一坑已修，勿回退。
6. 只换 CSS 内容、不换 HTML 里的 `?v=`，会让两页指向旧版本号却拿到新样式（版本号与内容不一致，排障时极易误判）；改 css 时务必同时改页面引用。

## 收录推送

- 百度普通收录（每天 08:12、20:12）：`POST http://data.zz.baidu.com/urls?site=https://www.obenno.com&token=<token>`，`Content-Type: text/plain`，请求体为换行分隔的网址。
- IndexNow（每天 08:12）：`POST https://api.indexnow.org/indexnow`，JSON 含 host / key / keyLocation / urlList。
- 08:12 班次附带收录复查：以 Googlebot UA 抓 `/` 与 `/sitemap.xml`，并在 Search Console 与 Bing 站长工具核对站点地图状态。

## 已知取舍

- 原字体缺「寰」「哈」两字（全站各出现一次），这两处走系统字体回退。
- 静态资源未设「一年 immutable」缓存头：该设置属 Cloudflare Browser Cache TTL，会牵连 HTML，改用版本号代替。
- 经文页正文为按节分段的纯文本；卷品目录目前只做了中论与楞严两部长篇，其余经页仍靠上下篇与总目导航。
- 纲要与史略只作教理与史实陈述，不引经文原文长句，异说处只记主流一说。

## 改版自检清单

- `curl -sI` 或浏览器核对改动文件的字节数、`?v=` 版本号是否同步。
- 看 `document.fonts` 里三个字体面的 `loaded / unloaded` 是否符合预期（首页不应加载生僻字面）。
- 点开一部经，确认 `texts/<id>.json` 有请求、节数与页面标注一致。
- 首屏搜一次经（如「因缘」）：应为**零个 `texts.json` 请求、约 32 个 `texts/` 分片请求**，结果数逐批增长后稳定。
- 中论/楞严页：`#toc` 链接数与 `.anc` 锚点数一致（31 / 10）；点任一品，`anchor.getBoundingClientRect().top` 应为 76，不被顶栏遮挡。
- 首页「名相」面板的计数应为 `83 / 83`；若仍是 48，说明 Service Worker 还缓存着旧 `app.js`，重载一次或检查 `sw.js` 是否用了 `ignoreSearch`。
- `sitemap.xml` 的 `lastmod` 与本次改动日期一致，条数（40）不变。
