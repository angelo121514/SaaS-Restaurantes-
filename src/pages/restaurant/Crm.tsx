import React, { useState } from "react";
import { Users, Phone, Mail, FileText, Plus, Search, Heart, User, Clock } from "lucide-react";
import { Card, Button, Input, Badge, Modal, Textarea } from "../../components/ui";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  lastVisit: string;
  favoriteDish: string;
  notes?: string;
}

export const Crm: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "cust-1",
      name: "Tomás Silva",
      phone: "+56 9 8765 4321",
      email: "tomas.silva@email.cl",
      totalOrders: 14,
      totalSpent: 135400,
      lastVisit: "Ayer, 20:30",
      favoriteDish: "Pizza Margherita",
      notes: "Prefiere salsa extra y masa delgada. Cliente muy recurrente de los fines de semana.",
    },
    {
      id: "cust-2",
      name: "Camila Gómez",
      phone: "+56 9 7654 3210",
      email: "camila.g@email.com",
      totalOrders: 8,
      totalSpent: 72800,
      lastVisit: "Hace 3 días, 14:15",
      favoriteDish: "Hamburguesa Vegana Crujiente",
      notes: "Vegetariana estricta. Alérgica a las nueces.",
    },
    {
      id: "cust-3",
      name: "Andrés Muñoz",
      phone: "+56 9 6543 2109",
      email: "andres.m@gmail.com",
      totalOrders: 5,
      totalSpent: 42500,
      lastVisit: "12 de Junio, 13:00",
      favoriteDish: "Macchiato de Caramelo Helado",
      notes: "Suele venir a trabajar por las tardes. Siempre pide mesa cerca de un enchufe.",
    },
    {
      id: "cust-4",
      name: "Sofía Rojas",
      phone: "+56 9 5432 1098",
      totalOrders: 3,
      totalSpent: 19500,
      lastVisit: "10 de Junio, 21:10",
      favoriteDish: "Bastones de Pan de Ajo",
      notes: "Pide principalmente para llevar.",
    },
  ]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenNotes = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNoteText(customer.notes || "");
    setShowAddNoteModal(true);
  };

  const handleSaveNotes = () => {
    if (!selectedCustomer) return;
    const updated = customers.map((c) => {
      if (c.id === selectedCustomer.id) {
        return { ...c, notes: noteText };
      }
      return c;
    });
    setCustomers(updated);
    setShowAddNoteModal(false);
    setSelectedCustomer(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2 flex items-center gap-2">
            <Users className="w-7 h-7 text-accent" />
            CRM de Clientes
          </h2>
          <p className="text-text-secondary">
            Conoce el historial de consumos, preferencias y notas de tus comensales recurrentes.
          </p>
        </div>
        <Badge variant="success" className="text-base px-4 py-1.5 flex items-center gap-1.5">
          <Heart className="w-4 h-4 fill-current" />
          Fidelización Pro Activa
        </Badge>
      </div>

      {/* Search Filter */}
      <Card className="!p-4 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <Input
            placeholder="Buscar por nombre, teléfono o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </Card>

      {/* Customer List */}
      <div className="grid gap-6">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Profile info */}
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3.5 bg-accent/5 rounded-full text-accent flex-shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-text">{customer.name}</h3>
                    <Badge variant="neutral" className="bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1 text-xs">
                      Favorito: {customer.favoriteDish}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-text-secondary">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-text-secondary/60" />
                      {customer.phone}
                    </p>
                    {customer.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-text-secondary/60" />
                        {customer.email}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-text-secondary/60" />
                      Último pedido: {customer.lastVisit}
                    </p>
                  </div>

                  {customer.notes && (
                    <div className="p-3 bg-bg-subtle rounded-lg border border-border text-sm text-text-secondary italic flex gap-1.5 items-start">
                      <FileText className="w-4 h-4 text-text-secondary/70 flex-shrink-0 mt-0.5" />
                      <p>{customer.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase statistics */}
              <div className="flex sm:items-center justify-between lg:flex-col lg:items-end gap-4 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 min-w-[200px]">
                <div className="text-left lg:text-right">
                  <p className="text-xs text-text-secondary uppercase tracking-wider">Historial de Consumo</p>
                  <p className="text-2xl font-black text-text mt-0.5">
                    ${customer.totalSpent.toLocaleString("es-CL")}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {customer.totalOrders} pedidos completados
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleOpenNotes(customer)}>
                  Editar Notas
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Notes Modal */}
      <Modal
        isOpen={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
        title={`Notas de Preferencia: ${selectedCustomer?.name}`}
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Detalles de Preferencia o Alergias"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Ej: Prefiere mesa al aire libre, alérgico al gluten, etc."
            rows={4}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAddNoteModal(false)} fullWidth>
              Cancelar
            </Button>
            <Button onClick={handleSaveNotes} fullWidth>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Crm;
