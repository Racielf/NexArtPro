import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { 
  Calendar, Clock, MapPin, User, Phone, Mail,
  Navigation, CheckCircle, Pencil, Trash2, 
  Truck, FileText, Search, Play, Square
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const emptyForm = {
  client_id: '', client_name: '', client_phone: '', client_email: '',
  client_address: '', scheduled_date: '', scheduled_time: '09:00',
  description: '', assigned_to: '', notes: ''
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [trackingId, setTrackingId] = useState(null);
  const [distance, setDistance] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const startPos = useRef(null);

  useEffect(() => {
    loadData();
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [appts, cls] = await Promise.all([
      base44.entities.Appointment.list('-scheduled_date'),
      base44.entities.Client.list('-created_date')
    ]);
    setAppointments(appts);
    setClients(cls);
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (appt) => { setEditing(appt); setForm({ ...appt }); setShowForm(true); };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(f => ({
        ...f,
        client_id: client.id,
        client_name: client.full_name,
        client_phone: client.phone || '',
        client_email: client.email || '',
        client_address: [client.address, client.city, client.state, client.zip].filter(Boolean).join(', ')
      }));
    }
  };

  const handleSave = async () => {
    if (!form.client_name || !form.scheduled_date) { toast.error('Client name and date are required'); return; }
    if (editing) {
      await base44.entities.Appointment.update(editing.id, form);
      toast.success('Appointment updated');
      // Notify client by email
      if (form.client_email) {
        await base44.integrations.Core.SendEmail({
          to: form.client_email,
          subject: 'Your appointment has been updated',
          body: `Hi ${form.client_name},\n\nYour appointment has been updated.\nDate: ${form.scheduled_date}\nTime: ${form.scheduled_time}\n\nThank you!`
        });
      }
    } else {
      await base44.entities.Appointment.create(form);
      toast.success('Appointment created');
      // Notify client
      if (form.client_email) {
        await base44.integrations.Core.SendEmail({
          to: form.client_email,
          subject: 'Appointment Scheduled',
          body: `Hi ${form.client_name},\n\nYour appointment has been scheduled!\nDate: ${form.scheduled_date}\nTime: ${form.scheduled_time}\nLocation: ${form.client_address}\n\nSee you then!`
        });
        toast.success('Notification sent to client');
      }
    }
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this appointment?')) return;
    await base44.entities.Appointment.delete(id);
    toast.success('Appointment deleted');
    loadData();
  };

  const handleOMW = async (appt) => {
    if (!navigator.geolocation) { toast.error('GPS not available'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      startPos.current = pos.coords;
      setTrackingId(appt.id);
      setDistance(0);

      const id = navigator.geolocation.watchPosition((newPos) => {
        if (startPos.current) {
          const miles = calcMiles(
            startPos.current.latitude, startPos.current.longitude,
            newPos.coords.latitude, newPos.coords.longitude
          );
          setDistance(miles);
        }
      });
      setWatchId(id);

      await base44.entities.Appointment.update(appt.id, {
        status: 'omw',
        omw_start_lat: pos.coords.latitude,
        omw_start_lng: pos.coords.longitude,
        omw_start_time: new Date().toISOString()
      });

      if (appt.client_email) {
        await base44.integrations.Core.SendEmail({
          to: appt.client_email,
          subject: "We're on our way!",
          body: `Hi ${appt.client_name},\n\nGood news! Your technician is on their way and will arrive shortly.\n\nSee you soon!`
        });
        toast.success('OMW notification sent to client!');
      }
      loadData();
    }, () => toast.error('Could not get GPS location'));
  };

  const handleFinish = async (appt) => {
    if (watchId) { navigator.geolocation.clearWatch(watchId); setWatchId(null); }
    const miles = distance || 0;
    await base44.entities.Appointment.update(appt.id, {
      status: 'completed',
      miles_traveled: parseFloat(miles.toFixed(2)),
      completed_time: new Date().toISOString()
    });
    setTrackingId(null);
    setDistance(null);
    startPos.current = null;
    toast.success(`Appointment completed! ${miles.toFixed(2)} miles traveled.`);
    loadData();
  };

  const calcMiles = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const filtered = appointments.filter(a =>
    a.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.client_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Appointments" subtitle={`${appointments.length} total`} actionLabel="New Appointment" onAction={openCreate} />

      <div className="p-6 space-y-4 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search appointments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No appointments found</p>
            <Button className="mt-4" onClick={openCreate}>Schedule first appointment</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(appt => (
              <Card key={appt.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{appt.client_name}</h3>
                          <StatusBadge status={appt.status} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />{appt.scheduled_date} {appt.scheduled_time && `at ${appt.scheduled_time}`}
                          </span>
                          {appt.client_address && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />{appt.client_address}
                            </span>
                          )}
                          {appt.assigned_to && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />{appt.assigned_to}
                            </span>
                          )}
                        </div>
                        {appt.description && <p className="text-sm text-muted-foreground mt-1">{appt.description}</p>}
                        {appt.miles_traveled > 0 && (
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            <Navigation className="w-3 h-3 inline mr-1" />{appt.miles_traveled} miles traveled
                          </p>
                        )}
                        {trackingId === appt.id && (
                          <div className="mt-2 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-sm text-orange-700 font-medium">
                              Tracking: {distance?.toFixed(2) || '0.00'} miles
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {appt.status === 'scheduled' && (
                        <Button size="sm" variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50" onClick={() => handleOMW(appt)}>
                          <Truck className="w-3 h-3 mr-1" />OMW
                        </Button>
                      )}
                      {(appt.status === 'omw' || trackingId === appt.id) && (
                        <Button size="sm" variant="outline" className="border-green-300 text-green-600 hover:bg-green-50" onClick={() => handleFinish(appt)}>
                          <CheckCircle className="w-3 h-3 mr-1" />Finish
                        </Button>
                      )}
                      {appt.status === 'completed' && (
                        <Button size="sm" asChild variant="outline" className="border-primary text-primary hover:bg-primary/5">
                          <Link to={`/estimates?appointment=${appt.id}&client_name=${encodeURIComponent(appt.client_name)}&client_email=${encodeURIComponent(appt.client_email || '')}&client_address=${encodeURIComponent(appt.client_address || '')}&client_phone=${encodeURIComponent(appt.client_phone || '')}`}>
                            <FileText className="w-3 h-3 mr-1" />Create Estimate
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(appt)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleDelete(appt.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Select Client</Label>
              <Select onValueChange={handleClientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose from existing clients..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name} · {c.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Client Name *</Label>
              <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Client name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.client_address} onChange={e => setForm({ ...form, client_address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description of Work</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the job..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Technician name" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create & Notify Client'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}