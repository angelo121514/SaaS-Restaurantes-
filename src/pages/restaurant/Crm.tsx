import React, { useState, useEffect } from "react";
import { Users, Phone, Mail, FileText, Plus, Search, Heart, User, Clock, ShoppingBag } from "lucide-react";
import { Card, Button, Input, Badge, Modal, Textarea } from "../../components/ui";
import { getCustomers, updateCustomer } from "../../services/restaurantService";
import { useRestaurantId } from "../../hooks/useAuth";

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
  lastSixPurchases?: {
    id: string;
    order_number: string;
    total: number;
    created_at: string;
    payment_method?: string;
    items: string;
  }[];
}

export const Crm: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const restaurantId = useRestaurantId();

  const loadCrmData = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const dbCustomers = await getCustomers(restaurantId);
    
    const mapped = dbCustomers.map((c: any) => {
      const completedOrders = (c.orders || []).filter((o: any) => o.status === "completed");
      const totalOrders = completedOrders.length;
      const totalSpent = completedOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);
      
      const lastVisit = completedOrders.length > 0
        ? new Date(Math.max(...completedOrders.map((o: any) => new Date(o.completed_at || o.created_at).getTime()))).toLocaleDateString("es-CL", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "Sin visitas";
        
      const itemCounts: Record<string, number> = {};
      completedOrders.forEach((o: any) => {
        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach((item: any) => {
          if (item.name) {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
          }
        });
      });
      
      let favoriteDish = "Ninguno";
      let maxCount = 0;
      for (const [name, count] of Object.entries(itemCounts)) {
        if (count > maxCount) {
          maxCount = count;
          favoriteDish = name;
        }
      }
      
      const lastSixPurchases = completedOrders
        .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 6)
        .map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          total: parseFloat(o.total || 0),
          created_at: o.created_at,
          payment_method: o.payment_method,
          items: Array.isArray(o.items) ? o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ") : "Sin detalle"
        }));

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || undefined,
        notes: c.notes || undefined,
        totalOrders,
        totalSpent,
        lastVisit,
        favoriteDish,
        lastSixPurchases,
      };
    });
    
    setCustomers(mapped);
    setLoading(false);
  };

  useEffect(() => {
    if (restaurantId) {
      loadCrmData();
    }
  }, [restaurantId]);

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

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    const { error } = await updateCustomer(selectedCustomer.id, { notes: noteText });
    if (error) {
      console.error("Error updating customer notes:", error);
      alert("No se pudo guardar la nota");
    } else {
      await loadCrmData();
      setShowAddNoteModal(false);
      setSelectedCustomer(null);
    }
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
      </Card>      {/* Customer List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Cargando datos del CRM...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="text-center py-12 text-text-secondary bg-bg border-border">
          <Users className="w-12 h-12 mx-auto text-text-secondary opacity-50 mb-3" />
          <p className="text-sm font-semibold">No se encontraron clientes</p>
          <p className="text-xs text-text-secondary mt-1">Registra nuevos pedidos en la Caja POS para añadir clientes al CRM.</p>
        </Card>
      ) : (
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
                      <Badge variant="neutral" className="bg-orange-500/10 text-orange-650 border border-orange-500/20 flex items-center gap-1 text-xs">
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

                    {/* Últimas 6 Compras */}
                    {customer.lastSixPurchases && customer.lastSixPurchases.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-dashed border-border pt-3">
                        <p className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-accent" />
                          Últimas {customer.lastSixPurchases.length} compras:
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {customer.lastSixPurchases.map((purchase) => (
                            <div key={purchase.id} className="p-2 bg-bg-subtle rounded border border-border text-xs flex flex-col justify-between gap-1">
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-semibold text-text">{purchase.order_number}</span>
                                <span className="text-[10px] text-text-secondary">{new Date(purchase.created_at).toLocaleDateString("es-CL")}</span>
                              </div>
                              <p className="text-text-secondary truncate" title={purchase.items}>
                                {purchase.items}
                              </p>
                              <div className="flex justify-between items-center mt-1 border-t border-border/40 pt-1">
                                <span className="text-accent font-bold">${purchase.total.toLocaleString("es-CL")}</span>
                                <span className="text-[10px] text-text-secondary uppercase">{purchase.payment_method === "cash" ? "Efectivo" : purchase.payment_method === "card" ? "Tarjeta" : "Transf."}</span>
                              </div>
                            </div>
                          ))}
                        </div>
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
      )}

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
