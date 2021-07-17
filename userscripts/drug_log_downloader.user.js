// ==UserScript==
// @name         DrugLogDownloader
// @namespace    tobytorn.torn.com
// @version      1.1.0
// @description  Drug log downloader
// @author       tobytorn[1617955]
// @match        https://www.torn.com/preferences.php
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const $ = window.jQuery;
    const API_PREFIX = 'https://api.torn.com/user/?comment=drug_log';

    async function readApi(params) {
        let url = API_PREFIX;
        for (const [k, v] of Object.entries(params)) {
            url += `&${k}=${v}`;
        }
        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error(`Failed to fetch "${url}"`);
        }
        const data = await resp.json();
        if (data.hasOwnProperty('error')) {
            throw new Error(`API error: ${JSON.stringify(data.error)}`);
        }
        return data;
    }

    async function getPlayerId(apiKey) {
        const data = await readApi({selections: 'basic', key: apiKey});
        return data.player_id;
    }

    async function getLog(apiKey, filters) {
        const data = await readApi({...filters, selections: 'log', key: apiKey});
        if (data.log === null) {
            return [];
        } else {
            return Object.values(data.log).sort((a, b) => b.timestamp - a.timestamp);
        }
    }

    async function getAllLog(apiKey, filters, description) {
        let t = Math.floor(new Date().getTime() / 1000);
        let allLog = [];
        while (true) {
            console.log('Retrieving log until', new Date(t * 1000).toLocaleDateString(), t, filters);
            $("#load_drug_log").text(`正在加载${description}日志 (${new Date(t * 1000).toLocaleDateString()})`);
            const currLog = await getLog(apiKey, {...filters, to: t});
            if (currLog.length === 0) {
                break;
            }
            allLog = allLog.concat(currLog);
            t = currLog[currLog.length - 1].timestamp;
            await new Promise(r => setTimeout(r, 1000));
        }
        return allLog;
    }

    let $prefContainer = $(".preferences-container");

    $prefContainer.append(`
        <div style="background-color: white; border-radius: 5px; padding: 5px;
                    margin-top: 10px; display: flex; align-items: center;">
            <button id="load_drug_log" class="torn-btn" style="margin-right: 8px">导出药瘾日志</button>
            <a id="download_drug_log" class="torn-btn disabled">下载</a>
        </div>
    `);

    $('#load_drug_log').click(async function () {
        $(this).prop('disabled', true);
        try {
            console.log('Retrieving API key from page');
            const apiKey = $("input#newapi").val();
            console.log(`Retrieved API key: ${apiKey}`);
            const playerId = await getPlayerId(apiKey);

            console.log('Retrieving all drug log');
            let logCount = 0;
            const drugLog = await getAllLog(apiKey, {cat: 61}, '药瘾');
            logCount += drugLog.length;
            // const addictionLog = await getAllLog(apiKey, {cat: 126}, '工作技能');
            // logCount += addictionLog.length;
            // const factionEnterLog = await getAllLog(apiKey, {log: 6253}, '进入帮派');
            // logCount += factionEnterLog.length;
            // const factionLeaveLog = await getAllLog(apiKey, {log: 6720}, '退出帮派');
            // logCount += factionLeaveLog.length;
            $(this).text(`全部日志加载完成 (共 ${logCount} 条)`);
            const data = {
                player: playerId,
                drug: drugLog,
                // addiction: addictionLog,
                // factionEnter: factionEnterLog,
                // factionLeave: factionLeaveLog,
            };

            const dataStr = encodeURIComponent(JSON.stringify(data));
            const dataUri = 'data:application/json;charset=utf-8,' + dataStr;
            $('#download_drug_log').removeClass('disabled');
            $('#download_drug_log').prop('download', `drug_log_${playerId}.json`);
            $('#download_drug_log').attr('href', dataUri);
        } catch (ex) {
            $(this).text(ex.toString());
        }
    });
})();
