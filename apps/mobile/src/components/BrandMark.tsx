import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export function BrandMark() {
  return (
    <View style={styles.mark} accessibilityElementsHidden>
      <Text style={styles.letter}>V</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  letter: { color: colors.background, fontSize: 28, fontWeight: "800" },
});
