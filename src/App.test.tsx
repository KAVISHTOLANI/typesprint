import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { PASSAGES } from './lib/passages';

afterEach(() => vi.useRealTimers());

describe('TypeSprint workflow', () => {
  it('finishes a whole-passage test with stats and saves it', async () => {
    localStorage.setItem('typesprint:history', '[]');
    localStorage.setItem('typesprint:mode', JSON.stringify('full'));
    localStorage.setItem('typesprint:passage', JSON.stringify('harbour'));
    window.location.hash = '/test';
    render(<App />);
    const text = PASSAGES[0].text;
    const area = screen.getByLabelText(/Start typing/);
    fireEvent.change(area, { target: { value: 'Thx' } }); // one mistake
    fireEvent.change(area, { target: { value: 'Th' } }); // corrected
    fireEvent.change(area, { target: { value: text } });
    expect(screen.getByTestId('wpm')).toBeInTheDocument();
    expect(Number(screen.getByTestId('accuracy').textContent!.replace('%', ''))).toBeLessThan(100);
    expect(JSON.parse(localStorage.getItem('typesprint:history')!)).toHaveLength(1);
  });

  it('ends a timed test when the clock runs out', async () => {
    localStorage.setItem('typesprint:history', '[]');
    localStorage.setItem('typesprint:mode', JSON.stringify('15'));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.location.hash = '/test';
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start typing/), { target: { value: 'The bo' } });
    await act(async () => { vi.advanceTimersByTime(16_000); });
    expect(screen.getByTestId('wpm')).toBeInTheDocument();
  });

  it('blocks pasting and shows history with an empty state', async () => {
    window.location.hash = '/test';
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    fireEvent.paste(screen.getByLabelText(/Start typing/));
    expect(screen.getByText('Pasting is disabled during a test.')).toBeInTheDocument();
    unmount();
    window.location.hash = '/history';
    render(<App />);
    expect(screen.getByTestId('best')).toHaveTextContent('55 WPM');
    await user.click(screen.getByRole('button', { name: 'Remove demo tests' }));
    expect(screen.getByText('No tests yet')).toBeInTheDocument();
  });
});
