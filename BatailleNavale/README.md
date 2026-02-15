Présentation du Projet
Ce projet consiste en l implémentation d un jeu de Bataille Navale en mode console développé en Java L objectif principal de ce dépôt est de documenter une progression concrète dans la maîtrise de la programmation structurée et du clean code Plutôt que de présenter uniquement le produit final ce document retrace les étapes de réflexion et les refactorisations successives qui ont structuré le socle technique du programme

v1.0 Approche Brute Force
Cette première version repose sur une logique algorithmique primaire où le flux du jeu est piloté par des structures conditionnelles imbriquées Choix technique Utilisation massive de structures if else if else Limite technique Absence de persistance des données durant l exécution entraînant un écrasement constant des variables Acquis Identification de la dette technique et des limites imposées par la programmation linéaire

v1.1 Amélioration du Flux de Contrôle
L introduction de la structure switch a permis de centraliser la gestion des menus et des entrées utilisateur Avantage Amélioration significative de la lisibilité du code source et séparation nette entre les différentes options de l interface Acquis Capacité à sélectionner la structure de contrôle optimale pour garantir la maintenabilité du code

v1.2 Refactorisation et Modularité
Le passage à la v1.2 marque une restructuration complète du programme via l usage de méthodes dédiées Choix technique Extraction de la logique métier dans des fonctions spécifiques comme l affichage de la grille ou la validation des coordonnées de tir Avantage Réduction drastique de la redondance et simplification du débogage grâce à la modularité Acquis Application rigoureuse du principe de responsabilité unique

v1.3 Optimisation des Données
La version actuelle se concentre sur la robustesse des structures de données et l automatisation des processus Objectifs Exploitation de tableaux multidimensionnels pour la gestion des grilles et développement d une logique de placement algorithmique État actuel Finalisation du système de placement automatique des navires pour l IA incluant la gestion de l aléatoire et la détection des collisions Acquis Manipulation avancée des générateurs d aléatoire et gestion des contraintes algorithmiques en environnement matriciel

v1.4 Système d Attaque et Boucle de Jeu
Cette étape marque le passage au système de combat dynamique Choix technique Fusion des méthodes de tir pour rationaliser le traitement des données et implémentation d une boucle de jeu interactive État actuel Le système d attaque est opérationnel pour l utilisateur permettant le ciblage du plateau adverse avec retour visuel en temps réel Limitation Le module de riposte adverse est en cours de développement rendant le système d attaque asymétrique dans cette itération Acquis Gestion des états de jeu et mise à jour dynamique des matrices de données suite aux actions utilisateur

Compétences Déployées
Maîtrise de l algorithmique fondamentale et du typage des données Aptitude à décomposer des problèmes complexes en modules réutilisables Analyse critique de la qualité logicielle et capacité de refactorisation continue
