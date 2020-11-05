// ==UserScript==
// @name         AppQuality Collector test
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Used to calculate time duration and number of visited pages.
// @author       Luca Cannarozzo (@cannarocks)
// @supportURL   https://github.com/cannarocks/web-basic-collector
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    //Costants
    const MINUTE_IN_MS = 60 * 1000;
    const HOUR_IN_MS = 60 * MINUTE_IN_MS;
    const DAY_IN_MS = 24 * HOUR_IN_MS;
    const WEEK_IN_MS = 7 * DAY_IN_MS;


    var appq_collector_record_start_time = false;


    function aq_addStyle(css) {
        const style = document.getElementById("appq_recorder_style") || (function () {
            var style = document.createElement('style');
            var head = document.getElementsByTagName('head')[0];
            style.type = 'text/css';
            style.id = "appq_recorder_style";

            if (style.styleSheet) {
                style.styleSheet.cssText = css;
            } else {
                style.appendChild(document.createTextNode(css));
            }

            head.appendChild(style);
        })();
    }

    function aq_addCollector() {
        var fab = document.createElement('div');
        fab.className = "aq-fab";
        fab.id = "aq-fab";

        if(getLocalStorage('appq_collector_record_start_time'))
        {
            fab.classList.add('running');
        }else if(getLocalStorage('appq_collector_duration_partial'))
        {
            fab.classList.add('paused');
        }


        var fabActionBtn = document.createElement('span');
        fabActionBtn.className = "aq-fab-action-button";
        fabActionBtn.innerHTML = '<i class="aq-fab-action-button__icon icon-material_dash"></i>';

        var fabList = document.createElement('ul');
        fabList.className = "aq-fab-buttons";

        fabList.innerHTML = '<li class="aq-fab-buttons__item"> <a href="#" id="appq_start_collector" class="aq-fab-buttons__link" data-tooltip="Start Recording"> <i class="icon-material icon-material_record"></i> </a></li><li class="aq-fab-buttons__item"> <a href="#" id="appq_stop_collector" class="aq-fab-buttons__link" data-tooltip="Stop Recording"> <i class="icon-material icon-material_stop"></i> </a></li><li class="aq-fab-buttons__item"> <a href="#" id="appq_pause_collector" class="aq-fab-buttons__link" data-tooltip="Pause Recording"> <i class="icon-material icon-material_pause"></i> </a></li><li class="aq-fab-buttons__item"> <a href="#" id="appq_resume_collector" class="aq-fab-buttons__link" data-tooltip="Resume Recording"> <i class="icon-material icon-material_play"></i> </a></li>';

        fab.appendChild(fabActionBtn);
        fab.appendChild(fabList);

        document.body.appendChild(fab);

    }

    /**
     * Functions
     */
    function appq_tm_start()
    {
        appq_collector_record_start_time = Date.now();
        setLocalStorage('appq_collector_record_start_time', appq_collector_record_start_time);
        updatePageCount();

        console.log('Started: ' + appq_collector_record_start_time);

        document.querySelector("#aq-fab").classList.add('running');
    }
    function appq_tm_stop()
    {
        var current = Date.now();
        var elapsed_ms = current - getLocalStorage('appq_collector_record_start_time');
        var pages = JSON.parse(getLocalStorage("appq_tm_pages"));

        if(getLocalStorage('appq_collector_duration_partial'))
        {
            elapsed_ms = elapsed_ms + parseInt(getLocalStorage('appq_collector_duration_partial'));
            localStorage.removeItem('appq_collector_duration_partial');
        }

        alert("View results in console");
        console.log("Elapsed: " + elapsed_ms + "ms");
        console.log("Elapsed: " + prettyPrintMs(elapsed_ms));
        console.log("Pages visited:");
        console.log(pages);

        localStorage.removeItem('appq_collector_record_start_time');
        localStorage.removeItem('appq_tm_pages');

        document.querySelector("#aq-fab").classList.remove('running');

        //Export CSV
        let csvBase = "data:text/csv;charset=utf-8,\uFEFF"
        let csvContent = "Page,Visits,Clicks,Total Elapsed\r\n";
        let totalTime = prettyPrintMs(elapsed_ms);

        //Add Pages visited
        if (Object.entries(pages).length)
        {
            for (const [key, value] of Object.entries(pages)) {
                var pageClicks = value.hasOwnProperty('clicks') ? value.clicks : 0;
                csvContent += key + "," + value.views + "," + pageClicks + "," + totalTime + "\r\n";
            }
        }

        console.log("CSV");
        console.log(csvContent);

        var encodedUriComponent = encodeURIComponent(csvContent);
        var encodedUri = encodeURI(csvContent);


        console.log("Encoded CSV");
        console.log(encodedUri);
        console.log(encodedUriComponent);
        console.log(csvBase + encodedUriComponent);

        window.open(csvBase + encodedUriComponent);

    }


    function appq_tm_pause()
    {
        var current = Date.now();
        var elapsed_ms = current - getLocalStorage('appq_collector_record_start_time');

        localStorage.removeItem('appq_collector_record_start_time');

        if(getLocalStorage('appq_collector_duration_partial'))
        {
            elapsed_ms = elapsed_ms + parseInt(getLocalStorage('appq_collector_duration_partial'));
            localStorage.removeItem('appq_collector_duration_partial');
        }

        setLocalStorage('appq_collector_duration_partial', elapsed_ms);

        document.querySelector("#aq-fab").classList.add('paused');
        document.querySelector("#aq-fab").classList.remove('running');

        console.log('Paused on: ' + current);
        console.log('Elapsed: ' + elapsed_ms);
    }
    function appq_tm_resume()
    {
        var current = Date.now();
        setLocalStorage('appq_collector_record_start_time', current);
        updatePageCount();

        document.querySelector("#aq-fab").classList.add('running');
        document.querySelector("#aq-fab").classList.remove('paused');

        console.log("Resumed: " + current)
    }

    function prettyPrintMs(ms) {
        ms = parseInt(ms);
        if (ms < MINUTE_IN_MS) {
            return fixDiff(ms / 1000, "seconds");
        } else if (ms < HOUR_IN_MS) {
            return fixDiff(ms / MINUTE_IN_MS, "minutes");
        } else if (ms < DAY_IN_MS) {
            return fixDiff(ms / HOUR_IN_MS, "hours");
        } else if (ms < WEEK_IN_MS) {
            return fixDiff(ms / DAY_IN_MS, "days");
        } else {
            return fixDiff(ms / WEEK_IN_MS, "weeks");
        }

    }

    function fixDiff(diff, dimension) {
        if (Math.round(diff) <= 1) {
            diff = 1;
        }

        return diff.toString() + " " + dimension;
    }

    function setLocalStorage(key, value) {
        if (typeof (Storage) !== "undefined") {
            localStorage.setItem(key, value)
        } else {
            console.log("Local Storage not supported!");
        }
    }

    function getLocalStorage(key) {
        if (typeof (Storage) !== "undefined") {
            return typeof (localStorage.getItem(key)) !== "undefined" && localStorage.getItem(key) !== null ? localStorage.getItem(key) : false;
        } else {
            return false;
        }
    }

    function updatePageCount() {
        var pages = getLocalStorage("appq_tm_pages");
        var currentPage = window.location.href;
        var _pages = {};

        if (pages) {
            _pages = JSON.parse(pages);

            if (currentPage in _pages) {
                _pages[currentPage].views = parseInt(_pages[currentPage].views) + 1;
            } else {
                _pages[currentPage] = {};
                _pages[currentPage].views = 1;
            }

        } else {
            _pages[currentPage] = {};
            _pages[currentPage].views = 1;
        }

        setLocalStorage("appq_tm_pages", JSON.stringify(_pages));

    }


    function appq_record_init()
    {
        aq_addStyle(".aq-fab{position:fixed;width:56px;right:3%;bottom:15px;margin-left:-28px;z-index:9999}.aq-fab:hover .aq-fab-buttons{opacity:1;visibility:visible}.aq-fab:hover .aq-fab-buttons__link{transform:scaleY(1) scaleX(1) translateY(-16px) translateX(0)}.aq-fab-action-button:hover+.aq-fab-buttons .aq-fab-buttons__link:before{visibility:visible;opacity:1;transform:scale(1);transform-origin:right center 0;transition-delay:.3s}.aq-fab-action-button{position:absolute;bottom:0;background:#fff;display:block;width:56px;height:56px;border:2px solid #000;border-radius:50%;box-shadow:0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12),0 3px 1px -2px rgba(0,0,0,.2)}.aq-fab-buttons{position:absolute;left:0;right:0;bottom:50px;list-style:none;margin:0;padding:0;opacity:0;visibility:hidden;transition:.2s}.aq-fab-action-button__icon{display:inline-block;width:56px;height:56px;background:url(data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz4KICAgIDxwYXRoIGQ9Ik0xOCAxNi4wOGMtLjc2IDAtMS40NC4zLTEuOTYuNzdMOC45MSAxMi43Yy4wNS0uMjMuMDktLjQ2LjA5LS43cy0uMDQtLjQ3LS4wOS0uN2w3LjA1LTQuMTFjLjU0LjUgMS4yNS44MSAyLjA0LjgxIDEuNjYgMCAzLTEuMzQgMy0zcy0xLjM0LTMtMy0zLTMgMS4zNC0zIDNjMCAuMjQuMDQuNDcuMDkuN0w4LjA0IDkuODFDNy41IDkuMzEgNi43OSA5IDYgOWMtMS42NiAwLTMgMS4zNC0zIDNzMS4zNCAzIDMgM2MuNzkgMCAxLjUtLjMxIDIuMDQtLjgxbDcuMTIgNC4xNmMtLjA1LjIxLS4wOC40My0uMDguNjUgMCAxLjYxIDEuMzEgMi45MiAyLjkyIDIuOTIgMS42MSAwIDIuOTItMS4zMSAyLjkyLTIuOTJzLTEuMzEtMi45Mi0yLjkyLTIuOTJ6Ii8+Cjwvc3ZnPg==) center no-repeat}.aq-fab-buttons__item{display:block;text-align:center;margin:12px 0}.aq-fab-buttons__link{display:inline-block;width:40px;height:40px;text-decoration:none;background-color:#fff;border-radius:50%;box-shadow:0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12),0 3px 1px -2px rgba(0,0,0,.2);transform:scaleY(.5) scaleX(.5) translateY(0) translateX(0);-moz-transition:.3s;-webkit-transition:.3s;-o-transition:.3s;transition:.3s;border:2px solid #000}[data-tooltip]:before{top:50%;margin-top:-11px;font-weight:600;border-radius:2px;background:#585858;color:#fff;content:attr(data-tooltip);font-size:12px;text-decoration:none;visibility:hidden;opacity:0;padding:4px 7px;margin-right:12px;position:absolute;transform:scale(0);right:100%;white-space:nowrap;transform-origin:top right;transition:all .3s cubic-bezier(.25,.8,.25,1)}[data-tooltip]:hover:before{visibility:visible;opacity:1;transform:scale(1);transform-origin:right center 0}.icon-material{display:inline-block;width:36px;height:36px;background:#fff}.icon-material_dash{background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCI+PGc+PHJlY3QgZmlsbD0ibm9uZSIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0Ii8+PHBhdGggZD0iTTExLDEwYzAtMC41NSwwLjQ1LTEsMS0xczEsMC40NSwxLDF2N2gtMlYxMHogTTIwLDEzYy0wLjU1LDAtMSwwLjQ1LTEsMXY1SDVWNWg1YzAuNTUsMCwxLTAuNDUsMS0xYzAtMC41NS0wLjQ1LTEtMS0xSDUgQzMuOSwzLDMsMy45LDMsNXYxNGMwLDEuMSwwLjksMiwyLDJoMTRjMS4xLDAsMi0wLjksMi0ydi01QzIxLDEzLjQ1LDIwLjU1LDEzLDIwLDEzeiBNMjEsNWgtMlYzYzAtMC41NS0wLjQ1LTEtMS0xcy0xLDAuNDUtMSwxdjIgaC0yYy0wLjU1LDAtMSwwLjQ1LTEsMWMwLDAuNTUsMC40NSwxLDEsMWgydjJjMCwwLjU1LDAuNDUsMSwxLDFzMS0wLjQ1LDEtMVY3aDJjMC41NSwwLDEtMC40NSwxLTFDMjIsNS40NSwyMS41NSw1LDIxLDV6IE0xNiwxMyBjLTAuNTUsMC0xLDAuNDUtMSwxdjNoMnYtM0MxNywxMy40NSwxNi41NSwxMywxNiwxM3ogTTcsMTJ2NWgydi01YzAtMC41NS0wLjQ1LTEtMS0xUzcsMTEuNDUsNywxMnoiLz48L2c+PC9zdmc+) center no-repeat}.icon-material_pause{background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0Ij48cGF0aCBkPSJNOCAxOWMxLjEgMCAyLS45IDItMlY3YzAtMS4xLS45LTItMi0ycy0yIC45LTIgMnYxMGMwIDEuMS45IDIgMiAyem02LTEydjEwYzAgMS4xLjkgMiAyIDJzMi0uOSAyLTJWN2MwLTEuMS0uOS0yLTItMnMtMiAuOS0yIDJ6Ii8+PC9zdmc+) center no-repeat}.icon-material_play{background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0Ij48cGF0aCBkPSJNOCA2LjgydjEwLjM2YzAgLjc5Ljg3IDEuMjcgMS41NC44NGw4LjE0LTUuMThjLjYyLS4zOS42Mi0xLjI5IDAtMS42OUw5LjU0IDUuOThDOC44NyA1LjU1IDggNi4wMyA4IDYuODJ6Ii8+PC9zdmc+) center no-repeat}.icon-material_stop{background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0Ij48cGF0aCBkPSJNOCA2aDhjMS4xIDAgMiAuOSAyIDJ2OGMwIDEuMS0uOSAyLTIgMkg4Yy0xLjEgMC0yLS45LTItMlY4YzAtMS4xLjktMiAyLTJ6Ii8+PC9zdmc+) center no-repeat}.icon-material_record{background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4Ii8+PC9zdmc+) center no-repeat}.aq-fab #appq_pause_collector,.aq-fab #appq_resume_collector,.aq-fab #appq_stop_collector{display:none}.aq-fab.running #appq_resume_collector,.aq-fab.running #appq_start_collector{display:none}.aq-fab.running #appq_pause_collector,.aq-fab.running #appq_stop_collector{display:inline-block}.aq-fab.paused #appq_pause_collector,.aq-fab.paused #appq_start_collector{display:none}.aq-fab.paused #appq_resume_collector,.aq-fab.paused #appq_stop_collector{display:inline-block}#aq-fab.running .aq-fab-action-button{border-color:red}#aq-fab.paused .aq-fab-action-button{border-color:coral}");

        aq_addCollector();

        appq_collector_record_start_time = getLocalStorage('appq_collector_record_start_time');

        if (appq_collector_record_start_time)
        {
            updatePageCount();
        }

        //Start
        document.querySelector("#appq_start_collector").addEventListener('click', function (e)
        {
            e.preventDefault();
            if (!getLocalStorage('appq_collector_record_start_time'))
            {
                //Start recording
                appq_tm_start()
            }

        });

        //Stop
        document.querySelector("#appq_stop_collector").addEventListener('click', function (e){
            e.preventDefault();
            if(confirm("Are you sure to stop time recording?"))
            {
                appq_tm_stop()
            }

        });

        //Pause
        document.querySelector("#appq_pause_collector").addEventListener('click', function (e){
            e.preventDefault();
            if(getLocalStorage('appq_collector_record_start_time'))
            {
                appq_tm_pause()
            }

        });

        //Pause
        document.querySelector("#appq_resume_collector").addEventListener('click', function (e){
            appq_tm_resume()
        });

        //Clicks
        var buttons = document.querySelectorAll("button, a");

        buttons.forEach(button => button.addEventListener("click", function(event) {

            if (event.target.matches('.aq-fab-buttons__link')) return;
            if (event.target.matches('.aq-fab')) return;

            var pages = getLocalStorage("appq_tm_pages");
            var currentPage = window.location.href;
            var _pages = {};

            if (pages) {
                _pages = JSON.parse(pages);

                if (currentPage in _pages)
                {
                    if(_pages[currentPage].hasOwnProperty('clicks'))
                    {
                        _pages[currentPage].clicks = parseInt(_pages[currentPage].clicks) + 1;
                    } else {

                        _pages[currentPage].clicks = 1;
                    }
                }else {
                    _pages[currentPage] = {};
                    _pages[currentPage].views = 1;
                    _pages[currentPage].clicks = 1;
                }

                setLocalStorage("appq_tm_pages", JSON.stringify(_pages));
            }
        }));


    }

    // Your code here...
    appq_record_init();

})();
