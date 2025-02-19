import { getAllCustomIconNames } from "./custom-icons";
import { guid, wait } from "./misc";
import { atomWithBrowserStorageStatic, storage } from "./storage";
import { FolderDetailsInStorage } from "./user-data/types";

export const analyticsEnabledAtom = atomWithBrowserStorageStatic('analyticsEnabled', false);
const ANALYTICS_TIMEOUT = 1000 * 60 * 60 * 24;
const MIXPANEL_TOKEN = '102076bf45f59f216724374916b45d48';
const MIXPANEL_BASE_URL = 'https://api-eu.mixpanel.com';

export const getUserId = async () => {
    let userId = await storage.getOne('userId');
    if (!userId) {
        userId = guid();
        await storage.setOne('userId', userId);
    }

    return userId;
};

export const gatherDailyUsageData = async (): Promise<any> => {
    const folders = await storage.getOne('folders') || [];
    const numberOfCustomFolders = folders.length;

    const customIcons = await getAllCustomIconNames();
    const numberOfCustomIcons = customIcons.length;

    const compactModeStorage = await storage.getOne('compactMode');
    const automaticCompactMode = await storage.getOne('automaticCompactMode');
    const compactMode = automaticCompactMode ? 'auto' : (compactModeStorage ? 'enabled' : 'disabled');

    const usedTheme = await storage.getOne('theme') || 'Greenery';

    const homeFolderDetails = ((await storage.getOneDynamic('Folder.home')) || { widgets: [] }) as FolderDetailsInStorage;
    const folderDetails = await Promise.all(folders.map(f => storage.getOneDynamic(`Folder.${f.id}`))) as FolderDetailsInStorage[];

    const widgetsUsage: Record<string, number> = {};
    homeFolderDetails.widgets.forEach(w => {
        const key = `wh_${w.widgetId}`;
        if (!widgetsUsage[key]) widgetsUsage[key] = 0;
        widgetsUsage[key] += 1;
    });

    folderDetails.forEach(f => {
        if (!f) return;
        f.widgets.forEach(w => {
            const key = `wo_${w.widgetId}`;
            if (!widgetsUsage[key]) widgetsUsage[key] = 0;
            widgetsUsage[key] += 1;
        });
    });

    return {
        numberOfCustomFolders,
        numberOfCustomIcons,
        compactMode,
        usedTheme,
        ...widgetsUsage
    };
};

export const sendAnalyticsIfEnabled = async (skipTimeout = false) => {
    const enabled = await storage.getOne('analyticsEnabled');
    if (!enabled) return;

    const lastSend = await storage.getOne('analyticsLastSend');
    if (lastSend && (lastSend + ANALYTICS_TIMEOUT) > Date.now() && !skipTimeout) return;

    const data = await gatherDailyUsageData();
    const userId = await getUserId();
    console.log('Before mixpanel call');

    const payload = {
        "event": "Daily stats",
        "properties": {
            "distinct_id": userId,
            "token": MIXPANEL_TOKEN,
            "time": Date.now(),
            "$insert_id": guid(),
            ...data,
        }
    };

    await fetch(`${MIXPANEL_BASE_URL}/track?ip=1`, {
        method: 'POST',
        headers: { accept: 'text/plain', 'content-type': 'application/json' },
        mode: 'no-cors',
        credentials: 'omit',
        body: `data=${encodeURIComponent(JSON.stringify(payload))}`,
    });
    await storage.setOne('analyticsLastSend', Date.now());
};

export const trackEvent = async (eventName: string, props: Record<string, any> = {}, timeout = 300) => {
    const enabled = await storage.getOne('analyticsEnabled');
    if (!enabled) return;
    const userId = await getUserId();

    const payload = {
        "event": eventName,
        "properties": {
            "distinct_id": userId,
            "token": MIXPANEL_TOKEN,
            "time": Date.now(),
            "$insert_id": guid(),
            ...props,
        }
    };

    const promise = fetch(`${MIXPANEL_BASE_URL}/track?ip=1`, {
        method: 'POST',
        headers: { accept: 'text/plain', 'content-type': 'application/json' },
        mode: 'no-cors',
        credentials: 'omit',
        body: `data=${encodeURIComponent(JSON.stringify(payload))}`,
    });

    return Promise.race([
        wait(timeout),
        promise
    ])
};