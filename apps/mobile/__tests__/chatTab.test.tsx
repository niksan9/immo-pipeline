/**
 * Chat tab integration tests (jest-expo + RNTL). Rendered through the full
 * Deal-Detail screen so the header bar, message list, suggestion chips, history
 * sheet and the scripted-reply timer all run against the live store chat slice.
 */

import * as React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'lindenstrasse-14' }),
  Stack: { Screen: () => null },
}));

import DealDetailScreen from '../app/deal/[id]/index';
import { DealsProvider } from '../src/data/store';
import { TYPING_MS } from '../src/components/detail/ChatTab';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderChatTab() {
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DealsProvider>
        <DealDetailScreen />
      </DealsProvider>
    </SafeAreaProvider>,
  );
  fireEvent.press(screen.getByTestId('tab-chat'));
}

describe('ChatTab — seed state', () => {
  it('opens on the "Allgemein" chat with its intro AI message', () => {
    renderChatTab();
    expect(screen.getByTestId('chat-title')).toHaveTextContent('Allgemein');
    expect(
      screen.getByText(/Ich kenne alle Dokumente und die Base-Kalkulation/),
    ).toBeTruthy();
  });
});

describe('ChatTab — send → user bubble + typing → scripted reply + source chip', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('shows the user message, a typing indicator, then the AI reply with source', () => {
    renderChatTab();

    fireEvent.changeText(screen.getByTestId('chat-input'), 'Wie sicher ist das Dach-Risiko?');
    fireEvent.press(screen.getByTestId('chat-send'));

    // User bubble in immediately + typing indicator while the reply is pending.
    expect(screen.getByText('Wie sicher ist das Dach-Risiko?')).toBeTruthy();
    expect(screen.getByTestId('chat-typing')).toBeTruthy();

    act(() => jest.advanceTimersByTime(TYPING_MS));

    // Typing gone, scripted reply + its mandatory source chip present.
    expect(screen.queryByTestId('chat-typing')).toBeNull();
    expect(screen.getByText(/Belegt: die ETV hat die Dachsanierung/)).toBeTruthy();
    expect(screen.getByText('ETV-Protokoll 2025 · S.3')).toBeTruthy();
  });
});

describe('ChatTab — suggestion chip sends its text', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('tapping "Was bei Zins 4,5 %?" sends it and yields the Kalkulation reply', () => {
    renderChatTab();

    fireEvent.press(screen.getByTestId('chat-suggestion-Was bei Zins 4,5 %?'));
    // The suggestion text now appears twice (the chip + the sent user bubble).
    // Message index 1 is the user bubble (index 0 is the Allgemein intro).
    expect(
      within(screen.getByTestId('chat-msg-1')).getByText('Was bei Zins 4,5 %?'),
    ).toBeTruthy();

    act(() => jest.advanceTimersByTime(TYPING_MS));

    expect(screen.getByText(/Bei 4,5 % Sollzins/)).toBeTruthy();
    // "Kalkulation · Base" appears as this reply's source chip.
    expect(screen.getAllByText('Kalkulation · Base').length).toBeGreaterThan(0);
  });
});

describe('ChatTab — Neu starts an empty chat, title derived from first question', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('new chat is empty ("Neuer Chat") then titled after the first message', () => {
    renderChatTab();

    fireEvent.press(screen.getByTestId('chat-neu'));
    expect(screen.getByTestId('chat-title')).toHaveTextContent('Neuer Chat');
    expect(screen.getByText(/Neuer Chat zu diesem Deal/)).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('chat-input'), 'Wie hoch ist die Miete?');
    fireEvent.press(screen.getByTestId('chat-send'));

    // Title now derived from the first question.
    expect(screen.getByTestId('chat-title')).toHaveTextContent('Wie hoch ist die Miete?');
  });
});

describe('ChatTab — Chat-Verlauf sheet lists chats + switches active', () => {
  it('lists both seed chats and switching to Dach-Risiko updates the header', () => {
    renderChatTab();

    fireEvent.press(screen.getByTestId('chat-history-open'));
    expect(screen.getByTestId('chat-history-sheet')).toBeTruthy();
    // Both seed threads are listed.
    expect(screen.getByTestId('chat-thread-allgemein')).toBeTruthy();
    expect(screen.getByTestId('chat-thread-dach-risiko')).toBeTruthy();

    fireEvent.press(screen.getByTestId('chat-thread-dach-risiko'));

    // Header now shows the Dach chat + its linked-topic chip.
    expect(screen.getByTestId('chat-title')).toHaveTextContent('Dach-Risiko klären');
    expect(screen.getByTestId('chat-linked-chip')).toBeTruthy();
  });
});

describe('ChatTab — linked-topic chip navigates to the risk', () => {
  beforeEach(() => mockPush.mockClear());

  it('tapping the "Risiko · Marodes Dach" chip pushes the risk route', () => {
    renderChatTab();
    fireEvent.press(screen.getByTestId('chat-history-open'));
    fireEvent.press(screen.getByTestId('chat-thread-dach-risiko'));

    fireEvent.press(screen.getByTestId('chat-linked-chip'));
    expect(mockPush).toHaveBeenCalledWith('/deal/lindenstrasse-14/risk/dach');
  });
});

describe('ChatTab — document source chip opens the DocViewer', () => {
  it('tapping the ETV source chip on the Dach chat opens the viewer', () => {
    renderChatTab();
    fireEvent.press(screen.getByTestId('chat-history-open'));
    fireEvent.press(screen.getByTestId('chat-thread-dach-risiko'));

    // The Dach chat's seeded AI answer carries the ETV source chip (message idx 1).
    fireEvent.press(screen.getByTestId('chat-source-1'));
    expect(screen.getByTestId('doc-viewer')).toBeTruthy();
    expect(screen.getByText('KI-ZUSAMMENFASSUNG')).toBeTruthy();
  });
});

describe('DocViewer "Zum Dokument fragen" creates a linked chat', () => {
  it('opens a document-linked chat on the Chat tab', () => {
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <DealsProvider>
          <DealDetailScreen />
        </DealsProvider>
      </SafeAreaProvider>,
    );

    // Open a finding document from the Dokumente tab, then "Zum Dokument fragen".
    fireEvent.press(screen.getByTestId('tab-docs'));
    fireEvent.press(screen.getByTestId('doc-row-etv-2025'));
    fireEvent.press(screen.getByTestId('doc-viewer-ask'));

    // We are now on the Chat tab with a new chat linked to that document.
    expect(screen.getByTestId('chat-tab')).toBeTruthy();
    expect(screen.getByTestId('chat-title')).toHaveTextContent('Frage zu ETV-Protokoll 2025');
    expect(screen.getByTestId('chat-linked-chip')).toBeTruthy();
    expect(
      within(screen.getByTestId('chat-linked-chip')).getByText(/Dokument · ETV-Protokoll 2025/),
    ).toBeTruthy();
  });
});
