import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { CircleAlert } from "lucide-react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <CircleAlert size={48} color="#6c757d" strokeWidth={1.5} />
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go back home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#FAFDF9",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#495057",
    marginTop: 8,
  },
  link: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#2D6A4F",
    borderRadius: 12,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
  },
});
