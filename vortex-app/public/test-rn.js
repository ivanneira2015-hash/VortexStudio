import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';

export default function App() {
  const [notas, setNotas] = useState([
    { id: 1, titulo: 'Reunion de equipo', descripcion: 'Revisar avances del sprint' },
    { id: 2, titulo: 'Compras del super', descripcion: 'Leche, pan, frutas, verduras' },
    { id: 3, titulo: 'Llamar al medico', descripcion: 'Turno para el lunes a las 10hs' },
    { id: 4, titulo: 'Pagar facturas', descripcion: 'Luz, gas, internet - vencen el 20' },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Mis Notas</Text>
      <FlatList
        data={notas}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.titulo}>{item.titulo}</Text>
            <Text style={styles.desc}>{item.descripcion}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { fontSize: 26, fontWeight: '800', padding: 20, color: '#1a1a2e' },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    elevation: 3,
  },
  titulo: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  desc: { fontSize: 14, color: '#666', lineHeight: 20 },
});
