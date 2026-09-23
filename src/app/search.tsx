// Search sheet (PRD 5.4, FR-001, FR-007): a sheet over the current view
// with the keyboard open on entry, results while typing, and a "Done"
// button that returns to where the user came from. Following is saved
// immediately; there is no "Cancel".

import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { SearchResultRow } from "@/components/SearchResultRow";
import { useFollowList } from "@/hooks/useFollowList";
import { useSearchShows } from "@/hooks/useSearchShows";
import { accent } from "@/theme/color";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: results, isLoading } = useSearchShows(query);
  const { isFollowed, follow, unfollow } = useFollowList();

  return (
    <View style={styles.container}>
      <TextInput
        autoFocus
        value={query}
        onChangeText={setQuery}
        placeholder="Search shows"
        style={styles.searchField}
        returnKeyType="search"
        accessibilityLabel="Search shows"
        clearButtonMode="while-editing"
        testID="search-input"
      />

      {query.trim().length > 0 && (
        <FlatList
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
          keyboardShouldPersistTaps="handled"
        />
      )}

      <Pressable
        accessibilityRole="button"
        style={styles.doneButton}
        onPress={() => router.back()}
        testID="search-done"
      >
        <Text style={styles.doneLabel}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
  },
  searchField: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    fontSize: 20,
  },
  resultsContent: {
    paddingBottom: 96,
  },
  noResults: {
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 32,
    color: "#666666",
  },
  doneButton: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    backgroundColor: accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  doneLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
