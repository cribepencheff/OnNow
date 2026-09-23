// Search sheet (PRD 5.4, FR-001, FR-007): a sheet over the current view
// with the keyboard open on entry, results while typing, and a round close
// button next to the search field that returns to where the user came
// from. It sits at the top so the keyboard never covers it (CRI-77).
// Following is saved immediately; there is no "Cancel".

import { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { CloseButton } from "@/components/CloseButton";
import { SearchResultRow } from "@/components/SearchResultRow";
import { useFollowList } from "@/hooks/useFollowList";
import { useSearchShows } from "@/hooks/useSearchShows";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: results, isLoading } = useSearchShows(query);
  const { isFollowed, follow, unfollow } = useFollowList();

  return (
    <View style={styles.container}>
      <View style={styles.header} testID="search-header">
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Search shows"
          style={styles.searchField}
          returnKeyType="search"
          // The return key ("Search") closes the keyboard; results already
          // appear while typing.
          submitBehavior="blurAndSubmit"
          // Show titles are names, not dictionary words: autocorrect would
          // rewrite them.
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Search shows"
          clearButtonMode="while-editing"
          testID="search-input"
        />
        <CloseButton onPress={() => router.back()} testID="search-close" />
      </View>

      {query.trim().length > 0 && (
        <FlatList
          testID="search-results"
          data={results ?? []}
          keyExtractor={(result) => String(result.show.id)}
          renderItem={({ item }) => (
            <SearchResultRow
              show={item.show}
              followed={isFollowed(item.show.id)}
              onToggleFollow={() =>
                isFollowed(item.show.id)
                  ? unfollow(item.show.id)
                  : follow(item.show.id)
              }
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
            !isLoading ? (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchField: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    fontSize: 20,
  },
  resultsContent: {
    paddingBottom: 32,
  },
  noResults: {
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 32,
    color: "#666666",
  },
});
