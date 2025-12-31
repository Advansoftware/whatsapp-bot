import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  Calendar,
  Tag,
  Brain,
  Star,
  MessageCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import api from "../lib/api";

interface ContactDetailsModalProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ContactDetails {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags: string[];
  birthDate?: string;
  gender?: string;
  city?: string;
  state?: string;
  university?: string;
  course?: string;
  occupation?: string;
  leadScore?: number;
  leadStatus?: string;
  aiAnalysis?: string;
  aiAnalyzedAt?: string;
  totalMessages: number;
  firstContactAt?: string;
  createdAt: string;
  memoriesByType: {
    fact: Array<{ key: string; value: string; confidence: number }>;
    preference: Array<{ key: string; value: string; confidence: number }>;
    need: Array<{ key: string; value: string; confidence: number }>;
    objection: Array<{ key: string; value: string; confidence: number }>;
    interest: Array<{ key: string; value: string; confidence: number }>;
    context: Array<{ key: string; value: string; confidence: number }>;
  };
}

const memoryTypeLabels: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  fact: { label: "Fatos", icon: CheckCircle, color: "text-blue-400" },
  preference: { label: "Preferências", icon: Star, color: "text-yellow-400" },
  need: { label: "Necessidades", icon: AlertCircle, color: "text-red-400" },
  objection: { label: "Objeções", icon: X, color: "text-orange-400" },
  interest: { label: "Interesses", icon: TrendingUp, color: "text-green-400" },
  context: { label: "Contexto", icon: MessageCircle, color: "text-purple-400" },
};

const leadStatusColors: Record<string, string> = {
  cold: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warm: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hot: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  qualified: "bg-green-500/20 text-green-400 border-green-500/30",
  unqualified: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const leadStatusLabels: Record<string, string> = {
  cold: "Frio",
  warm: "Morno",
  hot: "Quente",
  qualified: "Qualificado",
  unqualified: "Não Qualificado",
};

export default function ContactDetailsModal({
  contactId,
  isOpen,
  onClose,
}: ContactDetailsModalProps) {
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["info", "memories"])
  );

  useEffect(() => {
    if (isOpen && contactId) {
      loadContactDetails();
    }
  }, [isOpen, contactId]);

  const loadContactDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getContactDetails(contactId);
      setContact(data);
    } catch (error) {
      console.error("Error loading contact details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQualify = async () => {
    if (!contact) return;

    setQualifying(true);
    try {
      const result = await api.qualifyContact(contact.id);
      if (result.success) {
        setContact((prev) =>
          prev
            ? {
                ...prev,
                leadScore: result.score,
                leadStatus: result.status,
                aiAnalysis: result.analysis,
                aiAnalyzedAt: new Date().toISOString(),
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error qualifying contact:", error);
    } finally {
      setQualifying(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const formatDate = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-gray-400";
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getTotalMemories = () => {
    if (!contact) return 0;
    return Object.values(contact.memoriesByType).reduce(
      (acc, arr) => acc + arr.length,
      0
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[#1a1a2e] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                {contact?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {contact?.name || "Carregando..."}
                </h2>
                <p className="text-white/60 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {contact?.phone}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white/60" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : contact ? (
              <>
                {/* Lead Score Section */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-semibold text-white">
                        Análise de Lead
                      </h3>
                    </div>
                    <button
                      onClick={handleQualify}
                      disabled={qualifying}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      {qualifying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          {contact.aiAnalyzedAt
                            ? "Reanalisar"
                            : "Qualificar Lead"}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <p className="text-white/60 text-sm mb-1">Score</p>
                      <p
                        className={`text-3xl font-bold ${getScoreColor(
                          contact.leadScore
                        )}`}
                      >
                        {contact.leadScore ?? "-"}
                      </p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <p className="text-white/60 text-sm mb-1">Status</p>
                      {contact.leadStatus ? (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            leadStatusColors[contact.leadStatus] ||
                            leadStatusColors.cold
                          }`}
                        >
                          {leadStatusLabels[contact.leadStatus] ||
                            contact.leadStatus.toUpperCase()}
                        </span>
                      ) : (
                        <p className="text-white/40">-</p>
                      )}
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <p className="text-white/60 text-sm mb-1">Mensagens</p>
                      <p className="text-2xl font-bold text-white">
                        {contact.totalMessages}
                      </p>
                    </div>
                  </div>

                  {contact.aiAnalysis && (
                    <div className="bg-black/20 rounded-lg p-4">
                      <p className="text-white/80 text-sm whitespace-pre-wrap">
                        {contact.aiAnalysis}
                      </p>
                      {contact.aiAnalyzedAt && (
                        <p className="text-white/40 text-xs mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Analisado em{" "}
                          {new Date(contact.aiAnalyzedAt).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {!contact.aiAnalysis && (
                    <p className="text-white/40 text-sm text-center py-4">
                      Clique em "Qualificar Lead" para gerar uma análise com IA
                    </p>
                  )}
                </div>

                {/* Info Section */}
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <button
                    onClick={() => toggleSection("info")}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">
                        Informações
                      </h3>
                    </div>
                    {expandedSections.has("info") ? (
                      <ChevronUp className="w-5 h-5 text-white/60" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.has("info") && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {contact.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-white/40 text-xs">Email</p>
                                <p className="text-white">{contact.email}</p>
                              </div>
                            </div>
                          )}

                          {contact.birthDate && (
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-white/40 text-xs">
                                  Nascimento
                                </p>
                                <p className="text-white">
                                  {formatDate(contact.birthDate)}
                                  {calculateAge(contact.birthDate) &&
                                    ` (${calculateAge(
                                      contact.birthDate
                                    )} anos)`}
                                </p>
                              </div>
                            </div>
                          )}

                          {contact.gender && (
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-white/40 text-xs">Gênero</p>
                                <p className="text-white capitalize">
                                  {contact.gender}
                                </p>
                              </div>
                            </div>
                          )}

                          {(contact.city || contact.state) && (
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-white/40 text-xs">
                                  Localização
                                </p>
                                <p className="text-white">
                                  {[contact.city, contact.state]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              </div>
                            </div>
                          )}

                          {contact.university && (
                            <div className="flex items-center gap-3">
                              <GraduationCap className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-white/40 text-xs">
                                  Universidade
                                </p>
                                <p className="text-white">
                                  {contact.university}
                                </p>
                              </div>
                            </div>
                          )}

                          {contact.course && (
                            <div className="flex items-center gap-3">
                              <GraduationCap className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-white/40 text-xs">Curso</p>
                                <p className="text-white">{contact.course}</p>
                              </div>
                            </div>
                          )}

                          {contact.occupation && (
                            <div className="flex items-center gap-3">
                              <Briefcase className="w-4 h-4 text-white/40" />
                              <div>
                                <p className="text-white/40 text-xs">
                                  Ocupação
                                </p>
                                <p className="text-white">
                                  {contact.occupation}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-white/40" />
                            <div>
                              <p className="text-white/40 text-xs">
                                Primeiro Contato
                              </p>
                              <p className="text-white">
                                {formatDate(contact.firstContactAt)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {contact.tags && contact.tags.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Tag className="w-4 h-4 text-white/40" />
                              <p className="text-white/40 text-xs">Tags</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {contact.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs border border-purple-500/30"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {contact.notes && (
                          <div className="mt-4 p-3 bg-black/20 rounded-lg">
                            <p className="text-white/40 text-xs mb-1">Notas</p>
                            <p className="text-white/80 text-sm">
                              {contact.notes}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* AI Memory Section */}
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <button
                    onClick={() => toggleSection("memories")}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-semibold text-white">
                        Memória da IA
                      </h3>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                        {getTotalMemories()} itens
                      </span>
                    </div>
                    {expandedSections.has("memories") ? (
                      <ChevronUp className="w-5 h-5 text-white/60" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.has("memories") && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 space-y-4"
                      >
                        {Object.entries(contact.memoriesByType).map(
                          ([type, memories]) => {
                            if (memories.length === 0) return null;

                            const config = memoryTypeLabels[type];
                            const Icon = config?.icon || Brain;

                            return (
                              <div key={type} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Icon
                                    className={`w-4 h-4 ${
                                      config?.color || "text-white/40"
                                    }`}
                                  />
                                  <h4 className="text-sm font-medium text-white/80">
                                    {config?.label || type}
                                  </h4>
                                  <span className="text-xs text-white/40">
                                    ({memories.length})
                                  </span>
                                </div>
                                <div className="space-y-1 pl-6">
                                  {memories.map((memory, i) => (
                                    <div
                                      key={i}
                                      className="p-2 bg-black/20 rounded-lg text-sm"
                                    >
                                      <span className="text-purple-300 font-medium">
                                        {memory.key}:
                                      </span>{" "}
                                      <span className="text-white/80">
                                        {memory.value}
                                      </span>
                                      {memory.confidence < 0.8 && (
                                        <span className="text-white/30 text-xs ml-2">
                                          ({Math.round(memory.confidence * 100)}
                                          % confiança)
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        )}

                        {getTotalMemories() === 0 && (
                          <p className="text-white/40 text-sm text-center py-4">
                            Nenhuma memória registrada ainda. As memórias são
                            extraídas automaticamente das conversas.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-white/60">
                Erro ao carregar contato
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
