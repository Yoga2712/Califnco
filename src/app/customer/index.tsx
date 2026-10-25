import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { router } from "expo-router";

export default function CustomerHome() {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Welcome 👋</Text>
                <Text style={styles.title}>Calinfco</Text>
                <Text style={styles.subtitle}>
                    Pure water. Delivered to your doorstep.
                </Text>
            </View>

            <View style={styles.banner}>
                <Text style={styles.bannerTitle}>Fresh Water, Anytime 💧</Text>
                <Text style={styles.bannerText}>
                    Order your drinking water easily from Calinfco.
                </Text>
            </View>

            <Text style={styles.sectionTitle}>What do you need?</Text>

            <View style={styles.grid}>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push("/customer/products")}
                >
                    <Text style={styles.icon}>💧</Text>
                    <Text style={styles.cardTitle}>Products</Text>
                    <Text style={styles.cardText}>Browse water products</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push("/customer/services")}
                >
                    <Text style={styles.icon}>🛠️</Text>
                    <Text style={styles.cardTitle}>Services</Text>
                    <Text style={styles.cardText}>Explore our services</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push("/customer/orders")}
                >
                    <Text style={styles.icon}>📦</Text>
                    <Text style={styles.cardTitle}>My Orders</Text>
                    <Text style={styles.cardText}>Track your orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push("/customer/profile")}
                >
                    <Text style={styles.icon}>👤</Text>
                    <Text style={styles.cardTitle}>Profile</Text>
                    <Text style={styles.cardText}>Manage your account</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7FAFC",
    },

    header: {
        padding: 24,
        paddingTop: 50,
    },

    greeting: {
        fontSize: 16,
        color: "#64748B",
    },

    title: {
        fontSize: 32,
        fontWeight: "800",
        color: "#0F172A",
        marginTop: 4,
    },

    subtitle: {
        fontSize: 15,
        color: "#64748B",
        marginTop: 6,
    },

    banner: {
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 20,
        backgroundColor: "#0EA5E9",
    },

    bannerTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "800",
    },

    bannerText: {
        color: "#E0F2FE",
        fontSize: 14,
        marginTop: 8,
        lineHeight: 20,
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
        marginHorizontal: 20,
        marginTop: 28,
        marginBottom: 14,
    },

    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 30,
    },

    card: {
        width: "48%",
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        minHeight: 150,
        justifyContent: "center",
        elevation: 2,
    },

    icon: {
        fontSize: 32,
        marginBottom: 10,
    },

    cardTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#0F172A",
    },

    cardText: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 5,
    },
});