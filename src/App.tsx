/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Sparkles, TrendingUp, Calendar, Zap, Loader2 } from 'lucide-react';
import { analyzePricing, PricingAnalysis } from './services/geminiService';

export default function App() {
  const [formData, setFormData] = useState({
    type: 'Jean',
    brand: '',
    size: 'M',
    color: '',
    condition: 4,
    originalPrice: '',
    defects: '',
    notes: ''
  });

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState(false);
  const [showDefectWarning, setShowDefectWarning] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<PricingAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Charger la sauvegarde automatique
  useEffect(() => {
    const saved = localStorage.getItem('vinted-draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
      } catch(e) {
        console.error('Failed to parse saved draft', e);
      }
    }
  }, []);

  // Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem('vinted-draft', JSON.stringify(formData));
  }, [formData]);

  // Vérifier si état satisfaisant sans défauts
  useEffect(() => {
    if (formData.condition === 2 && !formData.defects) {
      setShowDefectWarning(true);
    } else {
      setShowDefectWarning(false);
    }
  }, [formData.condition, formData.defects]);

  // Données de marques par catégorie
  const brandTiers = {
    luxury: ['Dior', 'Gucci', 'Prada', 'Chanel', 'Louis Vuitton', 'Valentino', 'Saint Laurent'],
    premium: ['Zara', 'Mango', 'Sandro', 'Maje', 'COS', 'Everlane'],
    sport: ['Nike', 'Adidas', 'Puma', 'New Balance', 'Asics', 'Reebok'],
    basic: ['H&M', 'Uniqlo', 'Gap', 'C&A', 'Primark'],
    vintage: ['Vintage', 'Thrifted', 'Retro']
  };

  const typesByCategory: Record<string, string[]> = {
    Vêtements: ['Jean', 'T-shirt', 'Chemise', 'Robe', 'Veste', 'Pull', 'Pantalon', 'Shorts', 'Sweat'],
    Chaussures: ['Sneakers', 'Boots', 'Chaussures plates', 'Talons', 'Baskets', 'Mocassins'],
    Accessoires: ['Sac', 'Ceinture', 'Foulard', 'Bonnet', 'Gants', 'Chapeau', 'Montre']
  };

  // Prix par défaut selon le type d'article
  const getDefaultPrice = (type: string) => {
    const defaultPrices: Record<string, [number, number]> = {
      'Jean': [15, 30],
      'T-shirt': [5, 12],
      'Chemise': [8, 18],
      'Robe': [12, 25],
      'Veste': [20, 40],
      'Pull': [10, 22],
      'Pantalon': [10, 20],
      'Shorts': [5, 12],
      'Sweat': [10, 20],
      'Sneakers': [15, 30],
      'Boots': [20, 40],
      'Sac': [15, 35]
    };
    return defaultPrices[type] || [8, 18];
  };

  // Fonction pour le multiplicateur de marque
  const getBrandMultiplier = (brand: string) => {
    if (!brand) return 1;
    const brandLower = brand.toLowerCase().trim();
    
    if (brandTiers.luxury.some(b => brandLower === b.toLowerCase())) return 1.2;
    if (brandTiers.premium.some(b => brandLower === b.toLowerCase())) return 1.1;
    if (brandTiers.basic.some(b => brandLower === b.toLowerCase())) return 0.9;
    return 1;
  };

  // Moteur de pricing
  const calculatePrice = () => {
    if (!formData.brand) {
      const defaultPrice = getDefaultPrice(formData.type);
      return { 
        min: defaultPrice[0], 
        max: defaultPrice[1], 
        justification: 'Ajoute une marque pour une estimation plus précise' 
      };
    }

    if (!formData.originalPrice) {
      const defaultPrice = getDefaultPrice(formData.type);
      return { 
        min: defaultPrice[0], 
        max: defaultPrice[1], 
        justification: 'Ajoute le prix d\'origine pour affiner l\'estimation' 
      };
    }

    const original = parseInt(formData.originalPrice);
    let percentage = 0;

    // État
    switch(formData.condition) {
      case 5: percentage = 0.70; break;
      case 4: percentage = 0.50; break;
      case 3: percentage = 0.30; break;
      case 2: percentage = 0.15; break;
      default: percentage = 0.10;
    }

    const brandMultiplier = getBrandMultiplier(formData.brand);
    const basePrice = original * percentage * brandMultiplier;
    const min = Math.round(basePrice * 0.85);
    const max = Math.round(basePrice * 1.15);

    const conditionMap: Record<number, string> = { 
      5: 'Neuf avec étiquette', 
      4: 'Très bon état', 
      3: 'Bon état', 
      2: 'Satisfaisant' 
    };
    
    let brandNote = '';
    if (brandMultiplier > 1) brandNote = ' (marque premium)';
    if (brandMultiplier < 1) brandNote = ' (marque entrée de gamme)';
    
    const justification = `${conditionMap[formData.condition]}${brandNote} — ${min}€ à ${max}€`;

    return { min, max, justification };
  };

  // Générateur de titre
  const generateTitle = () => {
    const parts = [
      formData.brand || 'Article',
      formData.type,
      formData.size,
      formData.color
    ].filter(p => p);
    return parts.join(' ').substring(0, 55);
  };

  // Générateur de description
  const generateDescription = () => {
    const hooks = [
      `Franchement, ce ${formData.type.toLowerCase()} ${formData.brand ? `${formData.brand} ` : ''}est un incontournable.`,
      `Un super ${formData.type.toLowerCase()} ${formData.color ? `en ${formData.color} ` : ''}que j'adore.`,
      `Ce ${formData.type.toLowerCase()} ${formData.brand ? `${formData.brand} ` : ''}est vraiment classe.`,
      `Sympa ce ${formData.type.toLowerCase()} ${formData.brand ? `${formData.brand} ` : ''}, hyper pratique.`,
      `Coup de cœur pour ce ${formData.type.toLowerCase()} ${formData.color ? `${formData.color} ` : ''}.`
    ];

    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    const conditionDescriptions: Record<number, string> = {
      5: 'Jamais porté, étiquette encore attachée, état impeccable.',
      4: 'Porté 1-2 fois, aucun défaut visible, vraiment comme neuf.',
      3: 'Porté régulièrement mais en bon état — aucune déchirure ni trou.',
      2: 'Porté mais en état correct — quelques marques d\'usage visibles.'
    };

    const conditionText = conditionDescriptions[formData.condition];

    const parts = [
      hook,
      conditionText,
      formData.notes ? `${formData.notes}.` : '',
      formData.defects ? `⚠️ Attention : ${formData.defects}` : 'Tout est en parfait état.',
      'Nickel ! À toi !'
    ].filter(p => p);

    return parts.join(' ').substring(0, 600);
  };

  // Générateur d'hashtags
  const generateHashtags = () => {
    const tags = ['#vinted'];
    if (formData.brand) tags.push(`#${formData.brand.toLowerCase().replace(/\s/g, '')}`);
    if (formData.type) tags.push(`#${formData.type.toLowerCase()}`);
    if (formData.color) tags.push(`#${formData.color.toLowerCase()}`);
    if (formData.condition === 5) tags.push('#neuf');
    if (formData.condition === 4) tags.push('#tresbonetat');
    return tags.slice(0, 6).join(' ');
  };

  // Checklist photo
  const photoChecklist = [
    '📸 Vue d\'ensemble (article à plat ou sur mannequin)',
    '🏷️ Étiquette de marque (bien lisible)',
    '🧵 Détail matière (zoom sur le tissu/matière)',
    '👖 Détails clés (poches, fermetures, motifs)',
    '🔍 État général (coutures, usure)',
    formData.defects ? '⚠️ Gros plan sur les défauts mentionnés' : '',
    '✨ Vue finale (comment tu le porterais)'
  ].filter(p => p);

  // Fonction "Tout copier"
  const copyFullListing = () => {
    const fullListing = `${generateTitle()}\n\n${generateDescription()}\n\n💰 Prix : ${calculatePrice().min}€ - ${calculatePrice().max}€\n\n#️⃣ ${generateHashtags()}`;
    copyToClipboard(fullListing, 'full');
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const price = calculatePrice();
  const title = generateTitle();
  const description = generateDescription();
  const hashtags = generateHashtags();

  const handleAIAnalysis = async () => {
    if (!formData.brand) {
      alert("Ajoute une marque pour l'analyse AI !");
      return;
    }
    setIsAnalyzing(true);
    try {
      const conditionMap: Record<number, string> = { 
        5: 'Neuf avec étiquette', 
        4: 'Très bon état', 
        3: 'Bon état', 
        2: 'Satisfaisant' 
      };
      
      const analysis = await analyzePricing({
        ...formData,
        condition: conditionMap[formData.condition]
      });
      setAiAnalysis(analysis);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
            💰 Vinted Listing Generator
          </h1>
          <p className="text-lg text-gray-600">Crée des annonces qui vendent en 2 minutes</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* FORMULAIRE */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">📝 Tes infos</h2>
              <button
                onClick={() => {
                  if (window.confirm('Effacer toutes les données ?')) {
                    localStorage.removeItem('vinted-draft');
                    setFormData({
                      type: 'Jean',
                      brand: '',
                      size: 'M',
                      color: '',
                      condition: 4,
                      originalPrice: '',
                      defects: '',
                      notes: ''
                    });
                  }
                }}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                🗑️ Effacer
              </button>
            </div>

            <div className="space-y-5">
              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type d'article
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                >
                  {Object.entries(typesByCategory).map(([cat, types]) => (
                    <optgroup key={cat} label={cat}>
                      {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Marque */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Marque *
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="ex: Levi's, Zara, Nike..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              {/* Taille */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Taille
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="ex: M, 32, 42..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              {/* Couleur */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Couleur
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="ex: Bleu, Noir, Multicolore..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              {/* État */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  État ⭐
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 5, label: '⭐⭐⭐⭐⭐ Neuf', desc: 'Étiquette' },
                    { val: 4, label: '⭐⭐⭐⭐ Très bon', desc: '1-2x' },
                    { val: 3, label: '⭐⭐⭐ Bon', desc: 'Régulier' },
                    { val: 2, label: '⭐⭐ Satisfaisant', desc: 'Usé' }
                  ].map(option => (
                    <button
                      key={option.val}
                      onClick={() => setFormData({ ...formData, condition: option.val })}
                      className={`px-2 py-3 rounded-lg text-xs font-semibold transition ${
                        formData.condition === option.val
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="mb-1">{option.val === 5 ? '⭐⭐⭐⭐⭐' : option.val === 4 ? '⭐⭐⭐⭐' : option.val === 3 ? '⭐⭐⭐' : '⭐⭐'}</div>
                      <div className="font-bold">{option.label.split(' ').slice(1).join(' ')}</div>
                    </button>
                  ))}
                </div>
                {showDefectWarning && (
                  <p className="text-orange-600 text-sm mt-3 animate-pulse">
                    ⚠️ Pour un état satisfaisant, décris les défauts ci-dessous !
                  </p>
                )}
              </div>

              {/* Prix d'origine */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prix d'origine (optionnel)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="ex: 100"
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                  />
                  <div className="px-4 py-3 bg-gray-100 rounded-lg font-semibold text-gray-700">€</div>
                </div>
              </div>

              {/* Défauts */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Défauts visibles (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.defects}
                  onChange={(e) => setFormData({ ...formData, defects: e.target.value })}
                  placeholder="ex: Petite tache sous le bras, légère décoloration..."
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition ${
                    showDefectWarning ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-300 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes supplémentaires
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ex: Très confortable, fit parfait, lavable 30°..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none transition"
                />
              </div>
            </div>
          </div>

          {/* PRÉVISUALISATION */}
          <div className="space-y-6">
            {/* Bouton AI Analysis */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-1">
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition active:scale-95 disabled:opacity-75 disabled:cursor-wait"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    Analyse du marché en cours...
                  </>
                ) : (
                  <>
                    <Sparkles size={22} className="text-purple-500" />
                    Obtenir une estimation AI ultra-précise
                  </>
                )}
              </button>
            </div>

            {/* AI Results */}
            {aiAnalysis && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-6 sm:p-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Analyse du Marché AI</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 mb-8 text-center">
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <p className="text-sm font-semibold text-purple-600 mb-1">Prix AI suggéré</p>
                    <p className="text-3xl font-black text-indigo-600">{aiAnalysis.minPrice}€ - {aiAnalysis.maxPrice}€</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                    <div className="flex items-center justify-center gap-2 text-indigo-600 mb-1">
                      <TrendingUp size={18} />
                      <span className="text-sm font-semibold uppercase tracking-wider">Demande actuelle</span>
                    </div>
                    <p className="font-bold text-gray-900">{aiAnalysis.marketInsights.demand}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-purple-500"><Calendar size={20} /></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Impact saisonnier</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{aiAnalysis.marketInsights.seasonality}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-indigo-500"><Zap size={20} /></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Compétition</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{aiAnalysis.marketInsights.competition}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-gray-700 text-sm italic leading-relaxed">
                    "{aiAnalysis.reasoning}"
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                    🚀 Conseils de pro pour vendre vite
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Bouton Tout copier */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-4">
              <button
                onClick={copyFullListing}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition active:scale-95"
              >
                {copiedSection === 'full' ? (
                  <>
                    <CheckCircle2 size={22} className="text-green-500" />
                    Tout a été copié ! 🎉
                  </>
                ) : (
                  <>
                    <ClipboardList size={22} />
                    📋 Tout copier
                  </>
                )}
              </button>
            </div>

            {/* Titre */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">📌 Titre</h3>
                <button
                  onClick={() => copyToClipboard(title, 'title')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition active:scale-95"
                >
                  {copiedSection === 'title' ? (
                    <>
                      <CheckCircle2 size={18} />
                      Copié!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copier
                    </>
                  )}
                </button>
              </div>
              <p className="text-xl font-semibold text-gray-900 bg-indigo-50 p-4 rounded-lg">
                {title || 'Article...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">{title.length}/55 caractères</p>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">✍️ Description</h3>
                <button
                  onClick={() => copyToClipboard(description, 'description')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition active:scale-95"
                >
                  {copiedSection === 'description' ? (
                    <>
                      <CheckCircle2 size={18} />
                      Copié!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copier
                    </>
                  )}
                </button>
              </div>
              <p className="text-gray-700 bg-indigo-50 p-4 rounded-lg leading-relaxed whitespace-pre-line">
                {description}
              </p>
              <p className="text-sm text-gray-500 mt-2">{description.length}/600 caractères</p>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">💰 Prix suggéré</h3>
                <button
                  onClick={() => copyToClipboard(`${price.min}€ - ${price.max}€`, 'price')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition active:scale-95"
                >
                  {copiedSection === 'price' ? (
                    <>
                      <CheckCircle2 size={18} />
                      Copié!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copier
                    </>
                  )}
                </button>
              </div>
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-indigo-600 mb-2">
                  {price.min}€ → {price.max}€
                </p>
                <p className="text-sm text-gray-600 italic">{price.justification}</p>
              </div>
              <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full transition-all duration-500" 
                  style={{width: `${(price.min / (price.max || 1)) * 100}%`}}
                ></div>
              </div>
            </div>

            {/* Hashtags */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">#️⃣ Hashtags</h3>
                <button
                  onClick={() => copyToClipboard(hashtags, 'hashtags')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition active:scale-95"
                >
                  {copiedSection === 'hashtags' ? (
                    <>
                      <CheckCircle2 size={18} />
                      Copié!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copier
                    </>
                  )}
                </button>
              </div>
              <p className="text-gray-700 bg-indigo-50 p-4 rounded-lg font-mono text-sm">
                {hashtags}
              </p>
            </div>
          </div>
        </div>

        {/* Checklist photo */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <button
            onClick={() => setExpandedPhoto(!expandedPhoto)}
            className="w-full flex items-center justify-between cursor-pointer hover:opacity-75 transition"
          >
            <h2 className="text-2xl font-bold text-gray-900">📸 Conseils photo</h2>
            {expandedPhoto ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>

          {expandedPhoto && (
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photoChecklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg group hover:bg-indigo-100 transition">
                  <input 
                    id={`photo-check-${idx}`}
                    type="checkbox" 
                    className="mt-1 w-5 h-5 text-indigo-600 border-2 border-indigo-300 rounded cursor-pointer accent-indigo-600" 
                  />
                  <label htmlFor={`photo-check-${idx}`} className="text-gray-700 cursor-pointer font-medium text-sm">{item}</label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-8 inline-block">
            <p className="text-lg text-gray-700 mb-2">
              💡 <strong>Pro tip:</strong> Les annonces honnêtes et détaillées se vendent 2x plus vite !
            </p>
            <p className="text-sm text-gray-600">
              Copie directement depuis le widget et colle sur Vinted →️ VENDU ! 🎉
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
