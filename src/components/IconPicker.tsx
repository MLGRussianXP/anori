import { CSSProperties, Ref, useMemo, useState } from 'react';
import './IconPicker.scss';
import browser from 'webextension-polyfill';
import { PopoverRenderProps } from './Popover';
import { FixedSizeList } from 'react-window';
import { allSets, iconSetPrettyNames } from './icons/all-sets';
import { Select } from './Select';
import { Input } from './Input';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';
import { atom, useAtom } from 'jotai';
import { useEffect } from 'react';
import { useCustomIcons } from '@utils/custom-icons';

type IconPickerProps = PopoverRenderProps<{
    onSelected: (icon: string) => void,
    inputRef?: Ref<HTMLInputElement>
}>;

const COLUMNS = 8;
const ICON_SIZE = 32;
const PADDING = 10;

const IconCell = ({ icon, onClick }: { icon: string, onClick?: () => void }) => {
    return (
        <Tooltip label={icon} placement='bottom' showDelay={2000} resetDelay={0}>
            <div style={{ padding: PADDING }} className='IconCell' data-icon={icon} onClick={onClick}>
                <Icon icon={icon} width={ICON_SIZE} height={ICON_SIZE} />
            </div>
        </Tooltip>);
};

const IconRow = ({ index, data, style }: { index: number, style: CSSProperties, data: GridItemData }) => {
    const indexStart = index * COLUMNS;
    const indexEnd = Math.min(indexStart + COLUMNS, data.iconsList.length);

    return (<div className='IconRow' style={style}>
        {data.iconsList.slice(indexStart, indexEnd).map((icon) => {
            return (<IconCell key={icon} icon={icon} onClick={() => data.onSelected(icon)} />)
        })}
    </div>)
}

type GridItemData = {
    iconsList: string[],
    onSelected: (name: string) => void,
}

const iconsBySetAtom = atom<Record<string, string[]> | null>(null);
const ALL_SETS = '##ALL_SETS##';

export const IconPicker = ({ data, close }: IconPickerProps) => {
    const [selectedFamily, setSelectedFamily] = useState(ALL_SETS);
    const [query, setQuery] = useState('');
    const [iconsBySet, setIconsBySet] = useAtom(iconsBySetAtom);
    const { customIcons } = useCustomIcons();

    const iconsList = useMemo(() => {
        if (iconsBySet === null) return [];
        let base: [string, string[]][];
        if (selectedFamily === ALL_SETS) {
            base = [...Object.entries(iconsBySet), ['custom', customIcons.map(i => i.name)]];
        } else if (selectedFamily === 'custom') {
            base = [[selectedFamily, customIcons.map(i => i.name)]]
        } else {
            base = [[selectedFamily, iconsBySet[selectedFamily]]];
        }
        return base
            .map(([family, icons]) => icons.map(icon => `${family}:${icon}`))
            .flat()
            .filter(icon => icon.split(':')[1].includes(query.toLowerCase()));
    }, [selectedFamily, query, iconsBySet]);

    const ROWS = Math.ceil(iconsList.length / COLUMNS);

    useEffect(() => {
        const load = async () => {
            const url = browser.runtime.getURL(`/assets/icons/meta.json`);
            const resp = await fetch(url);
            const json = await resp.json();
            setIconsBySet(json);
        };
        if (iconsBySet === null) {
            load();
        }
    }, []);

    return (<div className='IconPicker'>
        <section>
            <label>Icons family:</label>
            <Select<string>
                options={[ALL_SETS, ...allSets]}
                value={selectedFamily}
                onChange={setSelectedFamily}
                getOptionKey={o => o}
                getOptionLabel={o => o === ALL_SETS ? 'All icons' : iconSetPrettyNames[o]}
            />
        </section>

        <section>
            <label>Icons: </label>
            <Input ref={data.inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder='Search' className='icons-search' />
            {(selectedFamily === 'custom' && iconsList.length === 0) ? <div className='no-custom-icons-alert'>
                <p>Custom icons are icons which you upload for later use in Anori. </p>
                <p>Currently, you don't have any custom icons. To upload your first custom icon please head to settings.</p>
            </div> : <FixedSizeList<GridItemData>
                className="icons-grid"
                height={350}
                itemCount={ROWS}
                itemSize={ICON_SIZE + PADDING * 2}
                width={COLUMNS * (ICON_SIZE + PADDING * 2) + 8} // 8px is for scrollbar
                itemData={{
                    iconsList,
                    onSelected: (icon) => {
                        close();
                        data.onSelected(icon);
                    },
                }}
            >
                {IconRow}
            </FixedSizeList>}
        </section>

    </div>)
};