import { I18nManager } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import App from '../../example/App';
import {
  localeFromTag,
  nativeMock,
  resetNativeMock,
} from '../../jest/nativeMock';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default
);

jest.mock('../NativeI18nKit', () => ({
  __esModule: true,
  default: require('../../jest/nativeMock').nativeMock,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const pressByLabel = (root: TestRenderer.ReactTestInstance, label: string) => {
  const target = root
    .findAll(
      (n) => typeof n.props.onPress === 'function' && texts(n).includes(label)
    )
    .at(0);
  if (!target) throw new Error(`no pressable labelled "${label}"`);
  return act(async () => target.props.onPress());
};

const flush = () => act(async () => {});

const texts = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAll((n) => (n.type as unknown) === 'Text')
    .map((n) => [n.props.children].flat().join(''));

async function renderApp() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });
  await flush();
  return renderer;
}

let mounted: TestRenderer.ReactTestRenderer | undefined;

beforeEach(() => {
  resetNativeMock();
  jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  // Behave like a real native layer: setAppLanguage persists what getAppLanguage reads.
  let stored = '';
  nativeMock.setAppLanguage.mockImplementation(async (tag: string) => {
    stored = tag;
    return true;
  });
  nativeMock.getAppLanguage.mockImplementation(() => stored);
});

afterEach(() => {
  act(() => mounted?.unmount());
  mounted = undefined;
  jest.restoreAllMocks();
});

describe('example app - API Explorer', () => {
  it('exercises every library API and reports all PASS', async () => {
    mounted = await renderApp();
    const all = texts(mounted.root);

    expect(all).toContain('17/17 passed ✅');
    expect(all.filter((t) => t === 'FAIL')).toHaveLength(0);
    expect(all.filter((t) => t === 'PASS')).toHaveLength(17);

    const called = (fn: jest.Mock) => expect(fn).toHaveBeenCalled();
    called(nativeMock.getDeviceLocales as jest.Mock);
    called(nativeMock.getDeviceLocale as jest.Mock);
    called(nativeMock.getCountry as jest.Mock);
    called(nativeMock.getCalendar as jest.Mock);
    called(nativeMock.getTimeZone as jest.Mock);
    called(nativeMock.getNumberFormatSettings as jest.Mock);
    called(nativeMock.uses24HourClock as jest.Mock);
    called(nativeMock.usesMetricSystem as jest.Mock);
    called(nativeMock.isRTLForLanguage as jest.Mock);
    called(nativeMock.setAppLanguage as jest.Mock);
    called(nativeMock.getAppLanguage as jest.Mock);
  });

  it('never sends an empty tag to native (negative paths are guarded in JS)', async () => {
    mounted = await renderApp();
    expect(nativeMock.setAppLanguage).not.toHaveBeenCalledWith('');
    expect(nativeMock.isRTLForLanguage).not.toHaveBeenCalledWith('');
  });

  it('reports FAIL rows and a red summary when native misbehaves', async () => {
    nativeMock.getCountry.mockReturnValue('not-a-country');
    nativeMock.usesMetricSystem.mockReturnValue('yes');
    mounted = await renderApp();
    const all = texts(mounted.root);

    expect(all).toContain('15/17 passed ❌');
    expect(all.filter((t) => t === 'FAIL')).toHaveLength(2);
  });

  it('reports a FAIL (not a crash) when setAppLanguage rejects', async () => {
    nativeMock.setAppLanguage.mockRejectedValue(new Error('denied'));
    mounted = await renderApp();
    const all = texts(mounted.root);
    expect(all.some((t) => t.includes('denied'))).toBe(true);
    expect(all.some((t) => t.includes('❌'))).toBe(true);
  });

  it('"Run again" re-executes every check', async () => {
    mounted = await renderApp();
    const before = (nativeMock.getCountry as jest.Mock).mock.calls.length;
    const rerun = mounted.root.findByProps({ testID: 'api-rerun' });
    await act(async () => {
      rerun.props.onPress();
    });
    await flush();
    expect((nativeMock.getCountry as jest.Mock).mock.calls.length).toBe(
      before + 1
    );
  });
});

describe('example app - localisation flow', () => {
  it('renders in the detected device language', async () => {
    nativeMock.getDeviceLocales.mockReturnValue([localeFromTag('fr-FR')]);
    mounted = await renderApp();
    expect(texts(mounted.root)).toContain('Exemple I18nKit');
  });

  it('switches language when a chip is tapped and updates RTL', async () => {
    mounted = await renderApp();
    expect(texts(mounted.root)).toContain('I18nKit Example');

    await pressByLabel(mounted.root, 'Français');
    expect(texts(mounted.root)).toContain('Exemple I18nKit');

    await pressByLabel(mounted.root, 'العربية');
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
  });

  it('pluralises the cart counter via the +/- buttons', async () => {
    mounted = await renderApp();
    expect(texts(mounted.root)).toContain('No items in cart');
    await pressByLabel(mounted.root, 'Add item');
    expect(texts(mounted.root)).toContain('1 item in cart');
    await pressByLabel(mounted.root, 'Add item');
    expect(texts(mounted.root)).toContain('2 items in cart');
  });
});
