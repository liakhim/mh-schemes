// MyHeat white / orange / black palette + scene theming derived from the background mode.

export const BRAND = {
    orange: '#ff6a00',
    orangeSoft: '#ff8a3d',
    black: '#141414',
    white: '#ffffff',
};

// Returns colors/lighting for the 3D scene given the current background mode ('light' | 'dark').
export const getSceneTheme = (bgMode) => {
    const light = bgMode !== 'dark';
    return {
        light,
        background: light ? '#f5f5f6' : '#141414',
        grid: {
            cellColor: light ? '#d8d8db' : '#2b2f3a',
            sectionColor: light ? '#b6b6ba' : '#3b4252',
        },
        wall: {
            color: light ? '#ededed' : '#eaeaea',
            selected: BRAND.orangeSoft,
            edge: BRAND.black,
            edgeSelected: BRAND.orange,
            ghostOpacity: light ? 0.14 : 0.16,
        },
        draft: {
            anchor: BRAND.orange,
            hover: light ? BRAND.black : BRAND.white,
            line: BRAND.orange,
        },
        light_: {
            ambient: light ? 0.85 : 0.35,
            hemi: light ? 0.6 : 0.55,
            hemiGround: light ? '#cccccc' : '#0b0d12',
            dir: light ? 1.0 : 1.15,
        },
    };
};
