import {
  createTheme,
  MantineColorsTuple,
  CSSVariablesResolver,
} from '@mantine/core';

const pink: MantineColorsTuple = [
  '#FFE5F0',
  '#FFB3D6',
  '#FF80BC',
  '#FF4DA2',
  '#FF1A88',
  '#FF1493',
  '#E5127F',
  '#CC106B',
  '#B20D57',
  '#990B43',
];

const cyan: MantineColorsTuple = [
  '#E5FFFE',
  '#B3FFFC',
  '#80FFF9',
  '#4DFFF6',
  '#1AFFF4',
  '#00FFF2',
  '#00E5DA',
  '#00CCC2',
  '#00B2AA',
  '#009992',
];

const neonYellow: MantineColorsTuple = [
  '#FBFFE5',
  '#F2FFB3',
  '#ECFF80',
  '#E6FF4D',
  '#E3FF1A',
  '#E0FF00',
  '#C9E500',
  '#B2CC00',
  '#9BB200',
  '#849900',
];

const neonBlue: MantineColorsTuple = [
  '#E5F5FF',
  '#B3E2FF',
  '#80CFFF',
  '#4DBCFF',
  '#1AA9FF',
  '#00A8FF',
  '#0097E5',
  '#0086CC',
  '#0075B2',
  '#006499',
];

const green: MantineColorsTuple = [
  '#E5FFF0',
  '#B3FFD1',
  '#80FFB2',
  '#4DFF93',
  '#1AFF74',
  '#00FF41',
  '#00E53A',
  '#00CC33',
  '#00B22D',
  '#009926',
];

const hackerDark: MantineColorsTuple = [
  '#C1C2C5',
  '#A6A7AB',
  '#909296',
  '#5C5F66',
  '#373A40',
  '#2C2E33',
  '#1A1B1E',
  '#141517',
  '#101113',
  '#0B0C0E',
];

export const theme = createTheme({
  primaryColor: 'pink',
  colors: {
    pink,
    cyan,
    neonYellow,
    neonBlue,
    green,
    dark: hackerDark,
  },
  defaultRadius: 'sm',
  fontFamily: "'JetBrains Mono', monospace",
  headings: {
    fontFamily: "'Orbitron', sans-serif",
  },
  components: {
    Button: { defaultProps: { variant: 'filled' } },
    TextInput: { defaultProps: { variant: 'filled' } },
    Textarea: { defaultProps: { variant: 'filled' } },
    Select: { defaultProps: { variant: 'filled' } },
    Card: { defaultProps: { withBorder: true } },
    Modal: { defaultProps: { overlayProps: { blur: 4 } } },
    Drawer: { defaultProps: { overlayProps: { blur: 4 } } },
    Paper: { defaultProps: { withBorder: true } },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--ab-glow-pink': '0 0 10px rgba(255,20,147,0.3)',
    '--ab-glow-green': '0 0 10px rgba(0,255,65,0.3)',
    '--ab-glow-cyan': '0 0 20px rgba(0, 255, 242, 0.3)',
    '--ab-bg-primary': '#050508',
    '--ab-bg-card': 'rgba(20, 20, 35, 0.9)',
    '--ab-border-dim': '#1a1a2e',
    '--ab-surface-0': 'var(--mantine-color-dark-9)',
    '--ab-surface-1': 'var(--mantine-color-dark-8)',
    '--ab-surface-2': 'var(--mantine-color-dark-7)',
  },
  light: {},
  dark: {},
});
