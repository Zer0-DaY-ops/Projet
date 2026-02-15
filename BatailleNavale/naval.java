import java.util.*;

public class naval {

    public static boolean positionmentH(int[][] plateau, int ligne, int colone,
            int taille, String orientation, int tl_bateau) {
        for (int i = 0; i < tl_bateau; i++) {
            if (colone + i >= 10 || plateau[ligne][colone + i] != 0) {
                System.out.println("Erreur : emplacement déjà pris ou hors limites !");
                return false;
            }
        }
        for (int e = 0; e < tl_bateau; e++) {
            plateau[ligne][colone + e] = 1;
        }
        System.out.println("Bateau bien placé !");
        return true;
    }

    public static boolean positionmentV(int[][] plateau, int ligne, int colone,
            int taille, String orientation, int tl_bateau) {
        for (int i = 0; i < tl_bateau; i++) {
            if (ligne + i >= 10 || plateau[ligne + i][colone] != 0) {
                System.out.println("Erreur : emplacement déjà pris ou hors limites !");
                return false;
            }
        }
        for (int e = 0; e < tl_bateau; e++) {
            plateau[ligne + e][colone] = 1;
        }
        System.out.println("Bateau bien placé !");
        return true;

    }

    void jouer() {
        int[][] plateau_ia = new int[10][10];

        navaL_ia intelligenceArtificielle = new navaL_ia();

        plateau_ia = intelligenceArtificielle.run();
        affichage(plateau_ia);

        System.out.println("Le plateau de l'IA est prêt, à toi de tirer !");
    }

    public static boolean bateau(int nbrestant, String nombateau) {
        if (nbrestant > 0) {
            return true;
        } else {
            System.out.println("erreur bateau deja placé");
            return false;
        }

    }

    public static void attaqueV(int[][] plateau_ia, int ligne_ia, int colone_ia) {
        if (ligne_ia < 0 || ligne_ia >= 10 || colone_ia < 0 || colone_ia >= 10) {
            System.out.println("hors de porté ");
            return;

        }
        if (plateau_ia[ligne_ia][colone_ia] != 0 && plateau_ia[ligne_ia][colone_ia] != 2) {
            plateau_ia[ligne_ia][colone_ia] = 2;
            System.out.println("touché");
        } else {
            System.out.println("raté");
        }
    }

    public static void attaqueH(int[][] plateau_ia, int ligne_ia, int colone_ia) {
        if (ligne_ia < 0 || ligne_ia >= 10 || colone_ia < 0 || colone_ia >= 10) {
            System.out.println("hors de porté ");
            return;

        }

        if (plateau_ia[ligne_ia][colone_ia] != 0 && plateau_ia[ligne_ia][colone_ia] != 2) {
            plateau_ia[ligne_ia][colone_ia] = 2;
            System.out.println("touché");
        } else {
            System.out.println("raté");
        }
    }

    public static void affichage(int[][] plateau) {
        System.out.print("   ");
        for (int a = 0; a < plateau[0].length; a++) {
            System.out.print((char) ('A' + a) + " ");

        }
        System.out.println("");
        for (int i = 0; i < plateau.length; i++) {
            System.out.print((i + 1) + " " + " ");
            for (int b = 0; b < plateau[i].length; b++) {
                System.out.print(plateau[i][b] + " ");

            }
            System.out.println("");

        }
    }

    Scanner scan = new Scanner(System.in);
    int entree, coordone, ligne, compteur = 5, choix;
    int sousmarin = 2, porteavion = 1, croissuer = 1, torpilleur = 1;
    boolean placement = true;

    void run() {
        int[][] plateau = new int[10][10];

        navaL_ia intelligenceArtificielle = new navaL_ia();
        int[][] plateau_ia = intelligenceArtificielle.run();
        System.out.println("entrez valeur ");

        for (int i = 1; i < plateau.length; i++) {
            for (int b = 1; b < plateau[i].length; b++) {
                plateau[i][b] = 0;
            }
        }

        while (sousmarin != 0 || porteavion != 0 || torpilleur != 0 || croissuer != 0) {
            System.out.println("entrez nombre entre 1-5 : ");
            System.out.println("1) - Porte-avion ");
            System.out.println("2) - sous-marin ");
            System.out.println("3) - croiseur");
            System.out.println("4) - torpilleur ");
            System.out.println("5) - sous-marin ");
            choix = scan.nextInt();
            switch (choix) {
                case 1:
                    if (bateau(porteavion, "Porte-avion") == false) {
                        continue;
                    }
                    System.out.println("porte avion");
                    System.out.println("horizontalement ?");
                    String orientation = scan.next();
                    System.out.println("Entrez la colonne (1-10) et la ligne (1-10) :");
                    coordone = scan.nextInt() - 1;
                    ligne = scan.nextInt() - 1;
                    boolean succes = false;
                    if (orientation.equals("oui")) {
                        // On appelle la méthode et on récupère son résultat (true ou false)
                        succes = positionmentH(plateau, ligne, coordone, 0, orientation, 5);
                    } else {
                        succes = positionmentV(plateau, ligne, coordone, 0, orientation, 5);
                    }

                    // 2. On ne met à jour les compteurs QUE si le placement a réussi
                    if (succes) {
                        porteavion--;
                        compteur++; // Si tu utilises compteur pour suivre le nombre total de bateaux
                        affichage(plateau);
                    } else {
                        System.out.println("Le bateau n'a pas pu être placé. Réessayez.");
                    }
                    break;
                case 2:
                    if (bateau(sousmarin, "sous-marin") == false) {
                        continue;
                    }
                    System.out.println("sous-marins");
                    System.out.println("horizontalement ?");
                    String orientation1 = scan.next();
                    System.out.println("Entrez la colonne (1-10) et la ligne (1-10) :");
                    coordone = scan.nextInt() - 1;
                    ligne = scan.nextInt() - 1;
                    boolean succes1 = false;
                    if (orientation1.equals("oui")) {
                        // On appelle la méthode et on récupère son résultat (true ou false)
                        succes1 = positionmentH(plateau, ligne, coordone, 0, orientation1, 3);
                    } else {
                        succes1 = positionmentV(plateau, ligne, coordone, 0, orientation1, 3);
                    }

                    // 2. On ne met à jour les compteurs QUE si le placement a réussi
                    if (succes1) {
                        sousmarin--;
                        compteur++; // Si tu utilises compteur pour suivre le nombre total de bateaux
                        affichage(plateau);
                    } else {
                        System.out.println("Le bateau n'a pas pu être placé. Réessayez.");
                    }
                    break;
                case 3:
                    if (bateau(croissuer, "croiseur") == false) {
                        continue;
                    }
                    System.out.println("croiseur");
                    System.out.println("horizontalement ?");
                    String orientation2 = scan.next();
                    System.out.println("Entrez la colonne (1-10) et la ligne (1-10) :");
                    coordone = scan.nextInt() - 1;
                    ligne = scan.nextInt() - 1;
                    boolean succes2 = false;
                    if (orientation2.equals("oui")) {
                        // On appelle la méthode et on récupère son résultat (true ou false)
                        succes2 = positionmentH(plateau, ligne, coordone, 0, orientation2, 4);
                    } else {
                        succes2 = positionmentV(plateau, ligne, coordone, 0, orientation2, 4);
                    }

                    // 2. On ne met à jour les compteurs QUE si le placement a réussi
                    if (succes2) {
                        croissuer--;
                        compteur++; // Si tu utilises compteur pour suivre le nombre total de bateaux
                        affichage(plateau);
                    } else {
                        System.out.println("Le bateau n'a pas pu être placé. Réessayez.");
                    }
                    break;
                case 4:
                    if (bateau(torpilleur, "torpilleur") == false) {
                        continue;
                    }
                    System.out.println("torpilleur");
                    System.out.println("horizontalement ?");
                    String orientation3 = scan.next();
                    System.out.println("Entrez la colonne (1-10) et la ligne (1-10) :");
                    coordone = scan.nextInt() - 1;
                    ligne = scan.nextInt() - 1;
                    boolean succes3 = false;
                    if (orientation3.equals("oui")) {
                        // On appelle la méthode et on récupère son résultat (true ou false)
                        succes3 = positionmentH(plateau, ligne, coordone, 0, orientation3, 2);
                    } else {
                        succes3 = positionmentV(plateau, ligne, coordone, 0, orientation3, 2);
                    }

                    // 2. On ne met à jour les compteurs QUE si le placement a réussi
                    if (succes3) {
                        torpilleur--;
                        compteur++; // Si tu utilises compteur pour suivre le nombre total de bateaux
                        affichage(plateau);
                    } else {
                        System.out.println("Le bateau n'a pas pu être placé. Réessayez.");
                    }
                    break;
                case 5:
                    if (bateau(sousmarin, "sous-marin") == false) {
                        continue;
                    }
                    System.out.println("sous-marin");
                    System.out.println("horizontalement ?");
                    String orientation4 = scan.next();
                    System.out.println("Entrez la colonne (1-10) et la ligne (1-10) :");
                    coordone = scan.nextInt() - 1;
                    ligne = scan.nextInt() - 1;
                    boolean succes4 = false;
                    if (orientation4.equals("oui")) {
                        // On appelle la méthode et on récupère son résultat (true ou false)
                        succes4 = positionmentH(plateau, ligne, coordone, 0, orientation4, 2);
                    } else {
                        succes4 = positionmentV(plateau, ligne, coordone, 0, orientation4, 2);
                    }

                    // 2. On ne met à jour les compteurs QUE si le placement a réussi
                    if (succes4) {
                        sousmarin--;
                        compteur++; // Si tu utilises compteur pour suivre le nombre total de bateaux
                        affichage(plateau);
                    } else {
                        System.out.println("Le bateau n'a pas pu être placé. Réessayez.");
                    }
                    break;
            }
        }

        while (true) {
            System.out.println("\n--- VOTRE PLATEAU ---");
            affichage(plateau);

            System.out.println("\n--- PLATEAU DE L'IA (CIBLE) ---");
            affichage(plateau_ia);

            System.out.println("à vous d'attaquer ");
            System.out.println("horizontalement ?");
            String orientation4 = scan.next();
            if (orientation4.equals("oui")) {
                System.out.println("entrez coordone ");
                coordone = scan.nextInt() - 1; // On retire 1 pour l'index
                ligne = scan.nextInt() - 1; // On retire 1 pour l'index
                attaqueH(plateau_ia, ligne, coordone);
                System.out.println("\n--- VOTRE PLATEAU ---");
                affichage(plateau);

                System.out.println("\n--- PLATEAU DE L'IA (CIBLE) ---");
                affichage(plateau_ia);
            } else if (orientation4.equals("non")) {
                System.out.println("entrez coordone ");
                coordone = scan.nextInt() - 1; // On retire 1 pour l'index
                ligne = scan.nextInt() - 1; // On retire 1 pour l'index
                attaqueV(plateau_ia, ligne, coordone);
                System.out.println("\n--- VOTRE PLATEAU ---");
                affichage(plateau);

                System.out.println("\n--- PLATEAU DE L'IA (CIBLE) ---");
                affichage(plateau_ia);
            }
        }
    }

    public static void main(String[] args) {
        new naval().run();
    }
}