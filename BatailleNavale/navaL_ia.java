/*
 * while (sousmarin != 0 || porteavion != 0 || torpilleur != 0 || croissuer !=
 * 0) {
 * // L'IA choisit un chiffre entre 0 et 4 (donc on ajoute +1 pour correspondre
 * à tes cases 1-5)
 * choix_ia = generateur.nextInt(5) + 1;
 * 
 * switch (choix_ia) {
 * case 1: // Porte-avion
 * if (bateau(porteavion, "Porte-avion") == false) continue;
 * 
 * // L'IA décide pile ou face pour l'orientation
 * int orienIA = generateur.nextInt(2); // 0 = oui, 1 = non
 * 
 * coordone = generateur.nextInt(10);
 * ligne = generateur.nextInt(10);
 * 
 * if (orienIA == 0) { // Equivalent de "oui"
 * positionmentH(plateau, ligne, coordone, ligne, "oui", 5);
 * } else { // Equivalent de "non"
 * positionmentV(plateau, ligne, coordone, ligne, "non", 5);
 * }
 * porteavion--;
 * compteur++;
 * break;
 * 
 * case 2: // Sous-marin
 * if (bateau(sousmarin, "sous-marin") == false) continue;
 * 
 * int orienIA2 = generateur.nextInt(2);
 * coordone = generateur.nextInt(10);
 * ligne = generateur.nextInt(10);
 * 
 * if (orienIA2 == 0) {
 * positionmentH(plateau, ligne, coordone, ligne, "oui", 3);
 * } else {
 * positionmentV(plateau, ligne, coordone, ligne, "non", 3);
 * }
 * sousmarin--;
 * compteur++;
 * break;
 * 
 * // Répète la même logique pour les autres cases (3, 4, 5)...
 * }
 * }
 * 
 */