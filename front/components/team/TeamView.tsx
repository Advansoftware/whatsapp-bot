import React, { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: "admin" | "manager" | "agent";
  isActive: boolean;
  createdAt: string;
  activeConversations: number;
}

export const TeamView: React.FC = () => {
  const api = useApi();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent" as "admin" | "manager" | "agent",
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await api.get("/api/team/members");
      setMembers(data);
    } catch (error) {
      console.error("Erro ao carregar equipe:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    try {
      await api.post("/api/team/members", newMember);
      setShowAddModal(false);
      setNewMember({ name: "", email: "", password: "", role: "agent" });
      loadMembers();
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao adicionar membro");
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    try {
      await api.put(`/api/team/members/${editingMember.id}`, {
        name: editingMember.name,
        role: editingMember.role,
        isActive: editingMember.isActive,
      });
      setEditingMember(null);
      loadMembers();
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao atualizar membro");
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este membro?")) return;
    try {
      await api.delete(`/api/team/members/${id}`);
      loadMembers();
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao remover membro");
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-red-500/20 text-red-400 border-red-500/30",
      manager: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      agent: "bg-green-500/20 text-green-400 border-green-500/30",
    };
    const labels = {
      admin: "Admin",
      manager: "Gerente",
      agent: "Atendente",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full border ${
          styles[role as keyof typeof styles]
        }`}
      >
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipe</h1>
          <p className="text-text-secondary text-sm">
            Gerencie os membros da sua equipe
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            person_add
          </span>
          Adicionar Membro
        </button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-xl p-4 border border-surface-hover">
          <p className="text-text-secondary text-sm">Total de Membros</p>
          <p className="text-2xl font-bold text-white">{members.length}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-surface-hover">
          <p className="text-text-secondary text-sm">Admins</p>
          <p className="text-2xl font-bold text-red-400">
            {members.filter((m) => m.role === "admin").length}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-surface-hover">
          <p className="text-text-secondary text-sm">Gerentes</p>
          <p className="text-2xl font-bold text-blue-400">
            {members.filter((m) => m.role === "manager").length}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-surface-hover">
          <p className="text-text-secondary text-sm">Atendentes</p>
          <p className="text-2xl font-bold text-green-400">
            {members.filter((m) => m.role === "agent").length}
          </p>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-surface rounded-xl border border-surface-hover overflow-hidden">
        <table className="w-full">
          <thead className="bg-background">
            <tr>
              <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">
                Membro
              </th>
              <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">
                Cargo
              </th>
              <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">
                Conversas Ativas
              </th>
              <th className="text-left text-text-secondary text-sm font-medium px-4 py-3">
                Status
              </th>
              <th className="text-right text-text-secondary text-sm font-medium px-4 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-t border-surface-hover hover:bg-background/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {member.picture ? (
                      <img
                        src={member.picture}
                        alt={member.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-text-secondary text-sm">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{getRoleBadge(member.role)}</td>
                <td className="px-4 py-3">
                  <span className="text-white font-medium">
                    {member.activeConversations}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {member.isActive ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        check_circle
                      </span>
                      Ativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-text-secondary text-sm">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        cancel
                      </span>
                      Inativo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditingMember({ ...member })}
                    className="p-2 hover:bg-background rounded-lg text-text-secondary hover:text-white transition-colors"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20 }}
                    >
                      edit
                    </span>
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 hover:bg-background rounded-lg text-text-secondary hover:text-red-400 transition-colors"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20 }}
                    >
                      delete
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-surface-hover">
            <h2 className="text-xl font-bold text-white mb-4">
              Adicionar Membro
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-white"
                  placeholder="Nome do membro"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-white"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) =>
                    setNewMember({ ...newMember, password: e.target.value })
                  }
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-white"
                  placeholder="********"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1">
                  Cargo
                </label>
                <select
                  value={newMember.role}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      role: e.target.value as "admin" | "manager" | "agent",
                    })
                  }
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-white"
                >
                  <option value="agent">Atendente</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-surface-hover text-text-secondary rounded-lg hover:bg-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMember}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-surface-hover">
            <h2 className="text-xl font-bold text-white mb-4">Editar Membro</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, name: e.target.value })
                  }
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1">
                  Cargo
                </label>
                <select
                  value={editingMember.role}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      role: e.target.value as "admin" | "manager" | "agent",
                    })
                  }
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-white"
                >
                  <option value="agent">Atendente</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingMember.isActive}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      isActive: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <label className="text-text-secondary text-sm">
                  Usuário ativo
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingMember(null)}
                className="flex-1 px-4 py-2 border border-surface-hover text-text-secondary rounded-lg hover:bg-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateMember}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
