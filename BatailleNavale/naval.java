import java.util.*;

public class naval {

    public static void positionmentH(int[][] plateau, int ligne, int colone,
            int taille, String orientation, int tl_bateau) {
        boolean possible = true;
        for (int i = 0; i < tl_bateau; i++) {
            if (colone + i >= 10 || plateau[ligne][colone + i] != 0) {
                possible = false;
            }
        }
        if (possible) {
            for (int e = 0; e < tl_bateau; e++) {
                plateau[ligne][colone + e] = 1;
            }
            System.out.println("bateau bien placé");
        } else {
            System.out.println("erreur emplacement deja pris ");
        }
    }

    public static void positionmentV(int[][] plateau, int ligne, int colone,
            int taille, String orientation, int tl_bateau) {
        boolean possible = true;
        for (int i = 0; i < tl_bateau; i++) {
            if (ligne + i >= 10 || plateau[ligne + i][colone] != 0) {
                possible = false;
            }
        }
        if (possible) {
            for (int e = 0; e < tl_bateau; e++) {
                plateau[ligne + e][colone] = 1;
            }
            System.out.println("bateau bien placé");
        } else {
            System.out.println("erreur emplacement deja pris ");
        }
    }

    public static boolean bateau(int nbrestant, String nombateau) {
        if (nbrestant > 0) {
            return true;
        } else {
            System.out.println("erreur bateau deja placé");
            return false;
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
        System.out.println("entrez valeur ");

        for (int i = 1; i < plateau.length; i++) {
            for (int b = 1; b < plateau[i].length; b++) {
                plateau[i][b] = 0;
            }
        }

        while (sousmarin != 0 || porteavion != 0 || torpilleur != 0 || croissuer != 0) {
            System.out.println("entrez nombre entre 1-5 : ");
            System.out.println("1) - sous-marin ");
            System.out.println("2) - porteavion ");
            System.out.println("3) - torpilleur ");
            System.out.println("4) - croissuer ");
            System.out.println("5) - sous-marin ");
            choix = scan.nextInt();
            switch (choix) {
                case 1:
                    if (bateau(porteavion, "Porte-avion") == false) {
                        continue;
                    }
                    System.out.println("porte avion");
                    compteur++;
                    porteavion--;
                    System.out.println("horizontalement ?");
                    String orientation = scan.next();
                    if (orientation.equals("oui")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentH(plateau, ligne, coordone, ligne, orientation, 5);
                        affichage(plateau);
                        break;
                    } else if (orientation.equals("non")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentV(plateau, ligne, coordone, ligne, orientation, 5);
                        affichage(plateau);
                    }
                    break;
                case 2:
                    if (bateau(sousmarin, "sous-marin") == false) {
                        continue;
                    }
                    System.out.println("sous-marins");
                    compteur++;
                    sousmarin--;
                    System.out.println("horizontalement ?");
                    String orientation1 = scan.next();
                    if (orientation1.equals("oui")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentH(plateau, ligne, coordone, ligne, orientation1, 3);
                        affichage(plateau);
                        break;
                    } else if (orientation1.equals("non")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentV(plateau, ligne, coordone, ligne, orientation1, 3);
                        affichage(plateau);
                    }

                    break;
                case 3:
                    if (bateau(croissuer, "croiseur") == false) {
                        continue;
                    }
                    System.out.println("croiseur");
                    compteur++;
                    croissuer--;
                    System.out.println("horizontalement ?");
                    String orientation2 = scan.next();
                    if (orientation2.equals("oui")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentH(plateau, ligne, coordone, ligne, orientation2, 4);
                        affichage(plateau);
                        break;
                    } else if (orientation2.equals("non")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentV(plateau, ligne, coordone, ligne, orientation2, 4);
                        affichage(plateau);
                    }

                    break;
                case 4:
                    if (bateau(torpilleur, "torpilleur") == false) {
                        continue;
                    }
                    System.out.println("torpilleur");
                    compteur++;
                    torpilleur--;
                    System.out.println("horizontalement ?");
                    String orientation3 = scan.next();
                    if (orientation3.equals("oui")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentH(plateau, ligne, coordone, ligne, orientation3, 2);
                        affichage(plateau);
                        break;
                    } else if (orientation3.equals("non")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentV(plateau, ligne, coordone, ligne, orientation3, 2);
                        affichage(plateau);
                    }

                    break;
                case 5:
                    if (bateau(sousmarin, "sous-marin") == false) {
                        continue;
                    }
                    System.out.println("sous-marin");
                    compteur++;
                    sousmarin--;
                    System.out.println("horizontalement ?");
                    String orientation4 = scan.next();
                    if (orientation4.equals("oui")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentH(plateau, ligne, coordone, ligne, orientation4, 3);
                        affichage(plateau);
                        break;
                    } else if (orientation4.equals("non")) {
                        System.out.println("entrez coordone ");
                        coordone = scan.nextInt();
                        ligne = scan.nextInt();
                        positionmentV(plateau, ligne, coordone, ligne, orientation4, 3);
                        affichage(plateau);
                    }

                    break;
            }
        }

        for (

                int i = 0; i < plateau.length; i++) {
            for (int j = 0; j < plateau[i].length; j++) {
                System.out.print(plateau[i][j] + " ");
            }
            System.out.println("");
        }
    }

    public static void main(String[] args) {
        new naval().run();
    }
}