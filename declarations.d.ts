import 'webextension-polyfill';

/* eslint-disable @typescript-eslint/no-unused-vars */

declare module 'webextension-polyfill' {
    namespace Storage {
        interface Static {
            session: StorageArea;
        }
    }
    namespace Manifest {
        interface WebExtensionManifestWebAccessibleResourcesC2ItemType {
            use_dynamic_url?: boolean;
        }

        interface WebExtensionManifest {
            optional_host_permissions?: MatchPattern[];
            browser_url_overrides?: WebExtensionManifestChromeUrlOverridesType;
        }
    }

    namespace Tabs {
        interface Static {
            group: (options: { createProperties?: { windowId?: number }, groupId?: number, tabIds?: number | number[] }) => Promise<number>
        }
    }
}


declare global {
    type FileSystemDirectoryNamesIterator = AsyncIterable<string>;
    type FileSystemDirectoryHandlesIterator = AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
    type FileSystemDirectoryEntriesIterator = AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;

    interface FileSystemDirectoryHandle {
        keys(): FileSystemDirectoryNamesIterator,
        values(): FileSystemDirectoryHandlesIterator,
        entries(): FileSystemDirectoryEntriesIterator,
    }

    interface FileSystemFileHandle {
        createWritable(): Promise<FileSystemWritableFileStream>,
    }

    type TabGroupColor = "grey" | "blue" | "red" | "yellow" | "green" | "pink" | "purple" | "cyan" | "orange";
    interface TabGroup {
        collapsed: boolean;
        color: TabGroupColor;
        id: number;
        windowId: number;
        title?: string;
    }

    interface ChromeTabGroupsStatic {
        update: (
            groupId: number,
            updateProperties: { collapsed?: boolean; color?: TabGroupColor; title?: string }
        ) => Promise<TabGroup | undefined>;
    }

    interface ChromeTabsStatic {
        group: (options: {
            createProperties?: { windowId?: number };
            groupId?: number;
            tabIds?: number | number[];
        }) => Promise<number>;
    }

    type ChromeBrowserAdditions = {
        tabGroups: ChromeTabGroupsStatic;
        tabs: ChromeTabsStatic;
    };
}

