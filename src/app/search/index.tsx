// Search sheet (PRD 5.4, FR-001, FR-007, FR-026): a sheet over the current view
// with the keyboard open on entry, results while typing, and a round close
// button next to the search field that returns to where the user came
// from. It sits at the top so the keyboard never covers it (CRI-77).
// Following is saved immediately; there is no "Cancel". A search waits for
// a short pause in typing, and a clear button (X) inside the field empties
// it, the same on iOS and Android (PRD 5.4).

import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";

import { AiringThisWeekRow } from "@/components/AiringThisWeekRow";
import { CloseButton } from "@/components/CloseButton";
import { SearchResultRow } from "@/components/SearchResultRow";
import { TopPicksRow } from "@/components/TopPicksRow";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFollowedEpisodes } from "@/hooks/useFollowedEpisodes";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useSearchShows } from "@/hooks/useSearchShows";
import {
  SettledFollowedContext,
  useSettledFollowed,
} from "@/hooks/useSettledFollowed";
import { POSTER_ROW_TOP_MARGIN } from "@/logic/poster-snap";
import { t, type } from "@/theme/tokens";

// The pause in typing before a search is sent (PRD 5.4).
const SEARCH_DELAY_MS = 250;

export default function SearchScreen() {
  const router = useGuardedRouter();
  // Shows followed before Search opened are left out of its rows; one
  // followed here stays, marked, while Search is open (CRI-131).
  const { hidden: settledFollowed } = useSettledFollowed();
  const [query, setQuery] = useState("");

  const searchedQuery = useDebouncedValue(query, SEARCH_DELAY_MS);
  const { data: results, isFetching } = useSearchShows(searchedQuery);
  // "No results" only once the search for what is typed has answered.
  const answered = !isFetching && searchedQuery.trim() === query.trim();

  return (
    <View style={styles.container}>
      <View style={styles.header} testID="search-header">
        <View style={styles.searchField}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            tintColor={t.inkMuted}
            size={16}
          />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search shows"
            placeholderTextColor={t.inkMuted}
            selectionColor={t.accent}
            style={styles.searchInput}
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
        </View>
        <CloseButton onPress={() => router.back()} testID="search-close" />
      </View>

      {query.trim().length === 0 ? (
        <SettledFollowedContext.Provider value={settledFollowed}>
          <BeforeTyping />
        </SettledFollowedContext.Provider>
      ) : (
        <FlatList
          testID="search-results"
          data={results ?? []}
          keyExtractor={(result) => String(result.show.id)}
          renderItem={({ item }) => (
            <SearchResultRow
              show={item.show}
              // Show detail opens inside the sheet, with a back arrow to
              // these results (PRD 5.6, CRI-79).
              onPress={() =>
                router.push({
                  pathname: "/search/show/[id]",
                  params: { id: String(item.show.id) },
                })
              }
            />
          )}
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

// Before typing (PRD 5.4, FR-026): Home's two poster rows as they are, the
// same components and data. "Top picks for you" only with followed shows,
// as on Home; the cards it has loaded are shared with Home's row
// (CRI-131). A card opens Show
// detail inside the sheet (PRD 5.6).
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
      <View style={styles.rowsTop} />
      {followedCount > 0 && (
        <TopPicksRow
          followedShows={followedShowList}
          detailPathname="/search/show/[id]"
        />
      )}
      <AiringThisWeekRow detailPathname="/search/show/[id]" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
    paddingTop: t.space4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space2 + 4,
    marginHorizontal: t.space4,
    marginBottom: t.space2 + 4,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: t.space2,
    paddingHorizontal: t.space4,
    borderRadius: t.radiusPill,
    backgroundColor: t.surfaceRaised,
  },
  searchInput: {
    flex: 1,
    ...type.headline,
    fontWeight: "400",
    paddingVertical: 12,
    color: t.ink,
  },
  // Above the first row; between rows, the slot under a row (CRI-131).
  rowsTop: {
    height: POSTER_ROW_TOP_MARGIN,
  },
  resultsContent: {
    paddingBottom: t.space10,
  },
  noResults: {
    ...type.body,
    textAlign: "center",
    marginTop: t.space10,
    paddingHorizontal: t.space10,
    color: t.inkMuted,
  },
});
