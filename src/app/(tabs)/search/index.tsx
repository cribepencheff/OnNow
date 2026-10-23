// Search (PRD 5.4, FR-001, FR-007, FR-026): a tab of its own (CRI-133),
// with the keyboard open on entry (search-focus.ts) and results while
// typing. Following is saved immediately; there is no "Cancel". A search
// waits for a short pause in typing, and a clear button (X) inside the
// field empties it, the same on iOS and Android (PRD 5.4).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { useFocusEffect, useNavigation } from "expo-router";

import { AiringThisWeekRow } from "@/components/AiringThisWeekRow";
import { SearchResultRow } from "@/components/SearchResultRow";
import { ShowRowSeparator } from "@/components/ShowRow";
import { TopPicksRow } from "@/components/TopPicksRow";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import {
  subscribeSearchFocus,
  takeSearchFocusRequest,
} from "@/hooks/search-focus";
import { useSearchShows } from "@/hooks/useSearchShows";
import { SettledDayContext, useSettledDay } from "@/hooks/useSettledDay";
import {
  SettledFollowedContext,
  useSettledFollowed,
} from "@/hooks/useSettledFollowed";
import { TAB_BAR_HEIGHT } from "@/logic/tab-bar";
import { t, type } from "@/theme/tokens";
import { SearchFieldFrame, searchFieldText } from "@/components/SearchField";

// The pause in typing before a search is sent (PRD 5.4).
const SEARCH_DELAY_MS = 250;

export default function SearchScreen() {
  const router = useGuardedRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  // Shows followed before Search opened are left out of its rows; one
  // followed here stays, marked, while Search is open (CRI-131). Search
  // stays mounted as a tab, so it settles them again each time it opens.
  const { hidden: settledFollowed, settle: settleFollowed } =
    useSettledFollowed();
  // The day Top picks is ordered by, settled when Search opens or regains
  // focus, never while the user is on the row (CRI-131).
  const { day: settledDay, settle: settleDay } = useSettledDay();
  useFocusEffect(settleDay);
  const [query, setQuery] = useState("");

  // Typing mode on entry (CRI-133): a request taken as Search gains focus
  // opens it, and one made while Search is already on screen (a tap on its
  // tab) focuses the field at once. Leaving Search closes the keyboard.
  useEffect(() => {
    const focusField = () => inputRef.current?.focus();
    const offFocus = navigation.addListener("focus", () => {
      if (takeSearchFocusRequest()) {
        settleFollowed();
        focusField();
      }
    });
    const offBlur = navigation.addListener("blur", () =>
      inputRef.current?.blur(),
    );
    const unsubscribe = subscribeSearchFocus(() => {
      if (navigation.isFocused() && takeSearchFocusRequest()) {
        focusField();
      }
    });
    // The first visit opens with the field focused (autoFocus below), so a
    // request made on the way here is used up.
    takeSearchFocusRequest();
    return () => {
      offFocus();
      offBlur();
      unsubscribe();
    };
  }, [navigation, settleFollowed]);

  const searchedQuery = useDebouncedValue(query, SEARCH_DELAY_MS);
  const { data: results, isFetching } = useSearchShows(searchedQuery);
  // "No results" only once the search for what is typed has answered.
  const answered = !isFetching && searchedQuery.trim() === query.trim();

  return (
    <View style={[styles.container, { paddingTop: insets.top + t.space4 }]}>
      <View style={styles.header} testID="search-header">
        <SearchFieldFrame style={styles.searchField}>
          <TextInput
            ref={inputRef}
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search shows"
            placeholderTextColor={t.inkMuted}
            selectionColor={t.accent}
            style={searchFieldText.input}
            returnKeyType="search"
            // The return key ("Search") closes the keyboard; results already
            // appear while typing.
            submitBehavior="blurAndSubmit"
            // Show titles are names, not dictionary words: autocorrect would
            // rewrite them.
            autoCorrect={false}
            spellCheck={false}
            accessibilityLabel="Search shows"
            testID="search-input"
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
              hitSlop={8}
              testID="search-clear"
            >
              <SymbolView
                name={{
                  ios: "xmark.circle.fill",
                  android: "cancel",
                  web: "cancel",
                }}
                tintColor={t.inkSubtle}
                size={18}
              />
            </Pressable>
          )}
        </SearchFieldFrame>
      </View>

      {query.trim().length === 0 ? (
        <SettledDayContext.Provider value={settledDay}>
          <SettledFollowedContext.Provider value={settledFollowed}>
            <BeforeTyping />
          </SettledFollowedContext.Provider>
        </SettledDayContext.Provider>
      ) : (
        <FlatList
          testID="search-results"
          data={results ?? []}
          keyExtractor={(result) => String(result.show.id)}
          renderItem={({ item }) => (
            <SearchResultRow
              show={item.show}
              knownAs={item.knownAs}
              // Show detail opens inside Search, with a back arrow to these
              // results (PRD 5.6, CRI-79).
              onPress={() =>
                router.push({
                  pathname: "/search/show/[id]",
                  params: { id: String(item.show.id) },
                })
              }
            />
          )}
          // A hairline between results, as in Shows (owner, 2026-10-23).
          ItemSeparatorComponent={SearchResultSeparator}
          ListEmptyComponent={
            answered ? (
              <Text style={styles.noResults}>
                No results. Try the original title.
              </Text>
            ) : null
          }
          contentContainerStyle={styles.resultsContent}
          // A tap on a follow circle is handled without closing the
          // keyboard first, so several shows can be followed in a row.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

function SearchResultSeparator() {
  return <ShowRowSeparator largePoster />;
}

// Before typing (PRD 5.4, FR-026): Home's two poster rows as they are, the
// same components and data. "Top picks for you" only with followed shows,
// as on Home; the cards it has loaded are shared with Home's row
// (CRI-131). A card opens Show
// detail inside Search (PRD 5.6).
function BeforeTyping() {
  const { followedShows, followedCount } = useFollowedEpisodes();
  const followedShowList = useMemo(
    () => followedShows.map(({ show }) => show),
    [followedShows],
  );

  return (
    <ScrollView
      testID="search-before-typing"
      contentContainerStyle={styles.resultsContent}
      // With the keyboard up, the first tap on a card or its follow circle
      // closes the keyboard and the next one acts (accepted by the owner).
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {followedCount > 0 && (
        <TopPicksRow
          followedShows={followedShowList}
          detailPathname="/search/show/[id]"
          quietEndOnArrival
        />
      )}
      <AiringThisWeekRow detailPathname="/search/show/[id]" quietEndOnArrival />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: t.contentInset,
    marginBottom: t.space2 + 4,
  },
  searchField: {
    flex: 1,
  },
  // The lists end above the tab bar.
  resultsContent: {
    paddingBottom: TAB_BAR_HEIGHT + t.space4,
  },
  noResults: {
    ...type.body,
    textAlign: "center",
    marginTop: t.space10,
    paddingHorizontal: t.space10,
    color: t.inkMuted,
  },
});
