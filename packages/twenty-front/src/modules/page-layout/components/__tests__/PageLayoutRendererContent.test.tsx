import { render, screen } from '@testing-library/react';

import { PageLayoutRendererContent } from '@/page-layout/components/PageLayoutRendererContent';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';

jest.mock('@/page-layout/components/PageLayoutTabsRenderer', () => ({
  PageLayoutTabsRenderer: () => <div>Page layout content</div>,
}));

jest.mock('@/page-layout/widgets/components/WidgetSkeletonLoader', () => ({
  WidgetSkeletonLoader: () => <div>Page layout loading</div>,
}));

jest.mock('@/page-layout/states/pageLayoutIsInitializedComponentState', () => ({
  pageLayoutIsInitializedComponentState: {},
}));

jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue',
  () => ({
    useAtomComponentStateValue: jest.fn(),
  }),
);

const mockUseAtomComponentStateValue = jest.mocked(useAtomComponentStateValue);

describe('PageLayoutRendererContent', () => {
  it('renders loading feedback until the page layout is initialized', () => {
    mockUseAtomComponentStateValue.mockReturnValue(false);

    render(<PageLayoutRendererContent />);

    expect(screen.getByText('Page layout loading')).toBeInTheDocument();
    expect(screen.queryByText('Page layout content')).not.toBeInTheDocument();
  });

  it('renders page layout content after initialization', () => {
    mockUseAtomComponentStateValue.mockReturnValue(true);

    render(<PageLayoutRendererContent />);

    expect(screen.getByText('Page layout content')).toBeInTheDocument();
    expect(screen.queryByText('Page layout loading')).not.toBeInTheDocument();
  });
});
