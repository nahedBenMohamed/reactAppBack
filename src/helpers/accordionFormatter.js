const formatAccordionData = data => {
	let lexicon_nouns = data['Lexikon: Nomen']
	lexicon_nouns.head = data['Lexikon: Nomen'].head;
	lexicon_nouns.values = dataLabel(data['Lexikon: Nomen'].values, "name");

	let lexicon_verbs = data['Lexikon: Verben'];
	lexicon_verbs.head = data['Lexikon: Verben'].head;
	lexicon_verbs.values = dataLabel(data['Lexikon: Verben'].values, "name");

	let phonetic_context_processes = data['Aussprache: Kontextprozesse'];
	phonetic_context_processes.head = data['Aussprache: Kontextprozesse'].head;
	phonetic_context_processes.values = dataLabel(data['Aussprache: Kontextprozesse'].values, "questionId");

	let phonetic_wordstructure_stressed = data['Aussprache: Veränderung der Wortstruktur und Wortbetonung'];
	phonetic_wordstructure_stressed.head = data['Aussprache: Veränderung der Wortstruktur und Wortbetonung'].head;
	phonetic_wordstructure_stressed.values = dataValue(data['Aussprache: Veränderung der Wortstruktur und Wortbetonung'].values);

	let phonetic_truncations = data['Aussprache: Trunkierung von Mehrsilbern durch Silbenauslassung'];
	phonetic_truncations.head = data['Aussprache: Trunkierung von Mehrsilbern durch Silbenauslassung'].head;
	phonetic_truncations.class = data['Aussprache: Trunkierung von Mehrsilbern durch Silbenauslassung'].class;
	phonetic_truncations.values = dataLabel(data['Aussprache: Trunkierung von Mehrsilbern durch Silbenauslassung'].values, "name");

	let phonetic_syllable_structures = data['Aussprache: Silbenstrukturprozesse'];
	phonetic_syllable_structures.head = data['Aussprache: Silbenstrukturprozesse'].head;
	phonetic_syllable_structures.values = dataValue(data['Aussprache: Silbenstrukturprozesse'].values);

	let phonetic_consonant_structures = data['Aussprache: Genauere Darstellung der Veränderungen bei Konsonantenverbindungen und Affrikaten (initial und final)'];
	phonetic_consonant_structures.head = data['Aussprache: Genauere Darstellung der Veränderungen bei Konsonantenverbindungen und Affrikaten (initial und final)'].head;
	phonetic_consonant_structures.values = dataValue(data['Aussprache: Genauere Darstellung der Veränderungen bei Konsonantenverbindungen und Affrikaten (initial und final)'].values);

	let phonetic_substitutions_consonants = data['Aussprache: Analyse der Substitutionsprozesse bei Konsonanten'];
	phonetic_substitutions_consonants.head = data['Aussprache: Analyse der Substitutionsprozesse bei Konsonanten'].head;
	phonetic_substitutions_consonants.values = dataLabel(data['Aussprache: Analyse der Substitutionsprozesse bei Konsonanten'].values, "name");

	let phonetic_substitutions_vowels = data['Aussprache: Substitution bei Vokalen'];
	phonetic_substitutions_vowels.head = data['Aussprache: Substitution bei Vokalen'].head;
	phonetic_substitutions_vowels.class = data['Aussprache: Substitution bei Vokalen'].class;
	phonetic_substitutions_vowels.values = dataLabel(data['Aussprache: Substitution bei Vokalen'].values, "name");

	let phonetic_substitution_processes = data['Aussprache: Übersicht über Substitutionsprozesse bei Einzelkonsonanten und in Konsonantenverbindungen'];
	phonetic_substitution_processes.head = data['Aussprache: Übersicht über Substitutionsprozesse bei Einzelkonsonanten und in Konsonantenverbindungen'].head;
	phonetic_substitution_processes.values = dataValue(data['Aussprache: Übersicht über Substitutionsprozesse bei Einzelkonsonanten und in Konsonantenverbindungen'].values);

	let phonetic_sound_preference = data['Aussprache: Lautpräferenz und funktionale Belastung'];
	phonetic_sound_preference.head = data['Aussprache: Lautpräferenz und funktionale Belastung'].head;
	phonetic_sound_preference.values = dataValue(data['Aussprache: Lautpräferenz und funktionale Belastung'].values);

	let phonetic_deformity = data['Aussprache: Phonetische Realisierung / Fehlbildungen'];
	phonetic_deformity.head = data['Aussprache: Phonetische Realisierung / Fehlbildungen'].head;
	phonetic_deformity.values = dataLabel(data['Aussprache: Phonetische Realisierung / Fehlbildungen'].values, "name");

	let accentuation_change = data['Aussprache: Betonungsveränderungen'];
	accentuation_change.head = data['Aussprache: Betonungsveränderungen'].head;
	accentuation_change.values = dataLabel(data['Aussprache: Betonungsveränderungen'].values, "name");

	let not_evaluable = data['Nicht auswertbare Wörter'];
	not_evaluable.head = data['Nicht auswertbare Wörter'].head;
	not_evaluable.values = dataLabel(data['Nicht auswertbare Wörter'].values, "name");

	return {
		"Lexikon: Nomen": lexicon_nouns,
		"Lexikon: Verben": lexicon_verbs,
		"Aussprache: Kontextprozesse": phonetic_context_processes,
		"Aussprache: Veränderung der Wortstruktur und Wortbetonung": phonetic_wordstructure_stressed,
		"Aussprache: Trunkierung von Mehrsilbern durch Silbenauslassung": phonetic_truncations,
		"Aussprache: Silbenstrukturprozesse": phonetic_syllable_structures,
		"Aussprache: Genauere Darstellung der Veränderungen bei Konsonantenverbindungen und Affrikaten (initial und final)": phonetic_consonant_structures,
		"Aussprache: Analyse der Substitutionsprozesse bei Konsonanten": phonetic_substitutions_consonants,
		"Aussprache: Substitution bei Vokalen": phonetic_substitutions_vowels,
		"Aussprache: Übersicht über Substitutionsprozesse bei Einzelkonsonanten und in Konsonantenverbindungen": phonetic_substitution_processes,
		"Aussprache: Lautpräferenz und funktionale Belastung": phonetic_sound_preference,
		"Aussprache: Phonetische Realisierung / Fehlbildungen": phonetic_deformity,
		"Aussprache: Betonungsveränderungen": accentuation_change,
		"Nicht auswertbare Wörter": not_evaluable
	}

}
function dataLabel(data, label) {
	const values = (data.length > 0) ? {} : [];
	data.forEach((item) => {
		const name = item[label]
		const itemValues = {};
		Object.keys(item).forEach((key) => {
			itemValues[key] = item[key];
		});
		if (itemValues.target) {
			let target = JSON.stringify(itemValues.target)
			target = target.replace('\n', '');
			target = target.replace('"', '"');
			target = target.replace('  ', '');
			target = target.replace('> <', '><');
			itemValues.target = target.replace('"<', '<');
			itemValues.target = itemValues.target.replace('>"', '>');
		}
		if (itemValues.realized_as) {
			let realized_as = JSON.stringify(itemValues.realized_as)
			realized_as = realized_as.replace('\n', '');
			realized_as = realized_as.replace('"', '"');
			realized_as = realized_as.replace('  ', '');
			realized_as = realized_as.replace('> <', '><');
			itemValues.realized_as = realized_as.replace('"<', '<');
			itemValues.realized_as = itemValues.realized_as.replace('>"', '>');
		}
		values[name] = { ...itemValues };
	});
	return values;
}
function dataValue(data) {
	const values = (data.length > 0) ? {} : [];
	data.forEach((item) => {
		const name = item.name
		values[name] = (item.value) ? [item.value] : [item.replaced, item.affection];
	});
	return values;
}
module.exports = formatAccordionData;