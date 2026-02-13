Voici le texte complet, structuré par paragraphes avec les titres de sous-parties en gras et sans ponctuation superflue (points ou tirets) comme demandé

Présentation du Projet
Ce projet consiste en l implémentation d un jeu de Bataille Navale en mode console développé dans le cadre de ma première année de BUT Informatique L objectif principal de ce dépôt est de documenter ma progression dans l apprentissage de la programmation structurée et du clean code Plutôt que de présenter uniquement le produit final ce document retrace les étapes de réflexion et les refactorisations successives qui ont marqué mon premier semestre

v1.0 Approche Brute Force
Cette première version marque mes premiers pas en algorithmique La logique reposait intégralement sur des structures conditionnelles imbriquées pour gérer le flux du jeu Choix technique Utilisation massive de structures if else if else Limite technique Les données n étaient pas stockées de manière persistante durant l exécution entraînant un écrasement constant des variables Acquis Compréhension de la notion de dette technique et des limites de la programmation linéaire

v1.1 Amélioration du Flux de Contrôle
Pour cette mise à jour j ai introduit la structure de contrôle switch pour centraliser la gestion des menus et des entrées utilisateur Avantage Amélioration significative de la lisibilité du code source et séparation plus claire entre les différentes options de l interface Acquis Sélection de la structure de contrôle la plus adaptée à la lisibilité plutôt que la simple fonctionnalité

v1.2 Refactorisation et Modularité
Le passage à la v1.2 a consisté en une restructuration complète du programme en utilisant des méthodes dédiées Choix technique Extraction de la logique métier dans des fonctions spécifiques comme l affichage de la grille ou la vérification des tirs Avantage Réduction de la redondance du code et facilité de débogage grâce à la modularité Acquis Application du principe de responsabilité unique et réutilisation du code

v1.3 Travaux en cours
La version actuelle se concentre sur l optimisation des structures de données et l ajout de fonctionnalités avancées Objectifs Implémentation de tableaux multidimensionnels pour la gestion de la grille et développement d une logique de tir automatique pour le système État actuel J ai finalisé le développement du système de placement automatique des navires par l IA qui gère désormais l aléatoire et les collisions Acquis Manipulation des générateurs d aléatoire et gestion des contraintes algorithmiques pour simuler un adversaire

Compétences Acquises
Maîtrise de l algorithmique fondamentale et du typage des données Capacité à décomposer un problème complexe en modules simples et réutilisables Analyse critique de la qualité de code et capacité de refactorisation
