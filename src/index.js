require('events').EventEmitter.prototype._maxListeners = 250;
const { lighthouseBatchParallel } = require('lighthouse-batch-parallel');

const smta = require('sitemap-to-array');
const sitemapUrl = 'https://www.marketingresults.net/sitemap.xml.php';

let pageCount = 0;
let finishedPages = 0;

const testString =
    '{"Device":"desktop","URL":"https://cheraewebtest.mriaim.com/casino-gaming","audits":{"performance":{"title":"Performance","score":null,"passed":false},"accessibility":{"title":"Accessibility","score":1,"passed":true},"best-practices":{"title":"Best-practices","score":null,"passed":false},"seo":{"title":"SEO","score":1,"passed":true},"pwa":{"title":"PWA","score":0.33},"speed-index":{"title":"Speed Index","score":"5.5 s","passed":false},"unminified-css":{"title":"CSS Minified","score":"1"},"unminified-javascript":{"title":"Js Minified","score":"1"},"total-byte-weight":{"title":"Page Weight","score":"801 KiB (Total size was)","passed":false},"image-alt":{"title":"Image Has Alt Tag","score":"1"},"uses-optimized-images":{"title":"Images Are Optimized","score":"12 KiB (Potential savings of)","passed":false},"button-name":{"title":"Valid Button Names","score":"1"},"color-contrast":{"title":"Color Contrast","score":"1"},"link-name":{"title":"Page Links have Valid Names","score":"1"},"link-text":{"title":"Links Have Text","score":"1"},"tap-targets":{"title":"Tap Targets Large Enough","score":"100% appropriately sized tap targets","passed":false},"duplicate-id":{"title":"No Duplicate IDs"},"document-title":{"title":"Document Has Title","score":"1"},"meta-description":{"title":"Description Tag Present","score":"1"},"html-lang-valid":{"title":"HTML has Valid Lang Attribute","score":"1"},"no-vulnerable-libraries":{"title":"No Known Vulnerable Libs","score":"2 vulnerabilities detected"},"errors-in-console":{"title":"Console Is Error Free","score":"0"},"image-aspect-ratio":{"title":"Images are Correct Aspect Ratio","score":"1"},"http-status-code":{"title":"HTTP Status Code","score":"1"},"is-crawlable":{"title":"Site is Crawlable","score":"1"},"robots-txt":{"title":"Robots Found","score":"1"},"passed":false}}';
const testData = [JSON.parse(testString)];

smta(sitemapUrl, { returnOnComplete: true }, (error, list) => {
    if (error) {
        console.error(error);
    } else {
        const targetWebsites = sitemapArrayToTargetWebsites(list);
        pageCount = targetWebsites.length;
        lighthousePages(targetWebsites);
    }
});

function sitemapArrayToTargetWebsites(arr) {
    return arr.map((el) => {
        return {
            Device: 'desktop',
            URL: el.loc,
        };
    });
}

function lighthousePages(targetWebsites) {
    const customAuditsConfig = {
        'speed-index': 'Speed Index',
        'unminified-css': 'CSS Minified',
        'unminified-javascript': 'Js Minified',
        'total-byte-weight': 'Page Weight',

        'image-alt': 'Image Has Alt Tag',
        'uses-optimized-images': 'Images Are Optimized',
        'button-name': 'Valid Button Names',
        'color-contrast': 'Color Contrast',
        'link-name': 'Page Links have Valid Names',
        'link-text': 'Links Have Text',
        'tap-targets': 'Tap Targets Large Enough',

        'duplicate-id': 'No Duplicate IDs',
        'document-title': 'Document Has Title',
        'meta-description': 'Description Tag Present',
        'html-lang-valid': 'HTML has Valid Lang Attribute',
        'no-vulnerable-libraries': 'No Known Vulnerable Libs',
        'errors-in-console': 'Console Is Error Free',
        'image-aspect-ratio': 'Images are Correct Aspect Ratio',
        'http-status-code': 'HTTP Status Code',
        'is-crawlable': 'Site is Crawlable',
        'robots-txt': 'Robots Found',
    };

    const lighthouseAuditing = lighthouseBatchParallel({
        input: {
            stream: targetWebsites,
        },
        customAudits: { stream: customAuditsConfig },
        // throttling: 'applied3G',
        outputFormat: 'jsObject',
        workersNum: 8,
    });

    let reports = [];

    lighthouseAuditing.on('data', ({ data }) => {
        reports.push(data);
        finishedPages++;
        console.log(`${finishedPages} of ${pageCount} completed.`);
    });

    lighthouseAuditing.on('error', ({ error }) => {
        console.log(error);
    });

    lighthouseAuditing.on('end', () => {
        presentData(reports);
    });
}

function presentData(lighthouseResults) {
    const passFailReport = lighthouseResults.map((results) => {
        const _simpleIsValid = (key) => {
            const score = results.audits[key].score;
            return score == '1';
        };

        const _testIsValid = (key, test) => {
            if (test === undefined) {
                return (results.audits[key].passed = _simpleIsValid(key));
            }
            results.audits[key].passed = test;
        };

        const url = results.URL;

        // validations
        // _testIsValid(
        //     'performance',
        //     Number(results.audits['performance'].score) > 0.85
        // );
        _testIsValid(
            'accessibility',
            Number(results.audits['accessibility'].score) > 0.85
        );
        // _testIsValid(
        //     'best-practices',
        //     Number(results.audits['best-practices'].score) > 0.85
        // );
        _testIsValid('seo', Number(results.audits['seo'].score > 0.85));
        _testIsValid(
            'speed-index',
            Number(results.audits['speed-index'].score.split('s')[0]) < 10
        );
        _testIsValid(
            'total-byte-weight',
            Number(
                results.audits['total-byte-weight'].score
                    .split('KiB')[0]
                    .replace(/,/g, '')
            ) < 1500
        );
        _testIsValid(
            'uses-optimized-images',
            Number(
                results.audits['uses-optimized-images'].score
                    .split('KiB')[0]
                    .replace(/,/g, '')
            ) < 300
        );
        _testIsValid(
            'tap-targets',
            results.audits['tap-targets'].score ===
                '100% appropriately sized tap targets'
        );

        // simple validations
        _testIsValid('unminified-css');
        _testIsValid('unminified-javascript');
        _testIsValid('image-alt');
        _testIsValid('button-name');
        _testIsValid('color-contrast');
        _testIsValid('link-name');
        _testIsValid('link-text');
        _testIsValid('document-title');
        _testIsValid('meta-description');
        _testIsValid('html-lang-valid');
        // Todo: Figure out no-vulnerable-libraries pass text
        _testIsValid('errors-in-console');
        _testIsValid('image-aspect-ratio');
        _testIsValid('http-status-code');
        _testIsValid('is-crawlable');
        _testIsValid('robots-txt');

        const passed = Object.values(results.audits).filter((el) => el.passed);
        const failed = Object.values(results.audits).filter((el) => {
            return el.passed === false;
        });

        return { url, passed, failed };
    });

    passFailReport.forEach((report) => {
        console.log(`\n${report.url}`);
        console.log(`Audits Passed: ${report.passed.length}`);
        console.log(`Audits Failed: ${report.failed.length}`);
        report.failed.forEach((issue) => {
            const value =
                issue.score === '0' || issue.score === '-1'
                    ? 'No'
                    : issue.score;
            console.log(` - ${issue.title}: ${value}`);
        });
    });
}

// presentData(testData);
