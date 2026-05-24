import React from "react";
import { View, Text, StyleSheet } from "react-native";

type ErrorBoxProps = {
  message: string | null;
};

export function ErrorBox({ message }: ErrorBoxProps): React.JSX.Element | null {
  if (!message) return null;

  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#ef4444",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    lineHeight: 18,
  },
});
