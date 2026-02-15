import java.util.*;

public class navaL_ia {

    public static boolean positionmentH_ia(int[][] plateau_ia, int ligne_ia, int colone_ia, int tl_bateau_ia) {
        if (colone_ia + tl_bateau_ia > 10)
            return false;
        for (int i = 0; i < tl_bateau_ia; i++) {
            if (plateau_ia[ligne_ia][colone_ia + i] != 0)
                return false;
        }
        for (int e = 0; e < tl_bateau_ia; e++) {
            plateau_ia[ligne_ia][colone_ia + e] = 1;
        }
        return true;
    }

    public static boolean positionmentV_ia(int[][] plateau_ia, int ligne_ia, int colone_ia, int tl_bateau_ia) {
        if (ligne_ia + tl_bateau_ia > 10)
            return false;
        for (int i = 0; i < tl_bateau_ia; i++) {
            if (plateau_ia[ligne_ia + i][colone_ia] != 0)
                return false;
        }
        for (int e = 0; e < tl_bateau_ia; e++) {
            plateau_ia[ligne_ia + e][colone_ia] = 1;
        }
        return true;
    }

    /*
     * public static void affichage_ia(int[][] plateau_ia) {
     * System.out.println("\n   A B C D E F G H I J");
     * for (int i = 0; i < 10; i++) {
     * System.out.print((i + 1) + (i < 9 ? "  " : " "));
     * for (int b = 0; b < 10; b++) {
     * System.out.print(plateau_ia[i][b] + " ");
     * }
     * System.out.println("");
     * }
     * }
     */

    int sousmarin_ia = 2, porteavion_ia = 1, croisseur_ia = 1, torpilleur_ia = 1;
    Random generateur = new Random();

    public int[][] run() {
        int[][] plateau_ia = new int[10][10];
        System.out.println("L'IA place ses bateaux...");

        while (sousmarin_ia > 0 || porteavion_ia > 0 || croisseur_ia > 0 || torpilleur_ia > 0) {

            int choix_ia = generateur.nextInt(4) + 1;
            int orienIA = generateur.nextInt(2);
            int lig = generateur.nextInt(10);
            int col = generateur.nextInt(10);

            switch (choix_ia) {
                case 1:
                    if (porteavion_ia > 0) {

                        boolean possible = (orienIA == 0) ? positionmentH_ia(plateau_ia, lig, col, 5)
                                : positionmentV_ia(plateau_ia, lig, col, 5);
                        if (possible)
                            porteavion_ia--;
                    }
                    break;

                case 2:
                    if (sousmarin_ia > 0) {

                        boolean possible2 = (orienIA == 0) ? positionmentH_ia(plateau_ia, lig, col, 3)
                                : positionmentV_ia(plateau_ia, lig, col, 3);
                        if (possible2)
                            sousmarin_ia--;
                    }
                    break;

                case 3:
                    if (torpilleur_ia > 0) {
                        boolean possibl3 = (orienIA == 0) ? positionmentH_ia(plateau_ia, lig, col, 2)
                                : positionmentV_ia(plateau_ia, lig, col, 2);
                        if (possibl3)
                            torpilleur_ia--;
                    }
                    break;

                case 4:
                    if (croisseur_ia > 0) {
                        boolean possible4 = (orienIA == 0) ? positionmentH_ia(plateau_ia, lig, col, 4)
                                : positionmentV_ia(plateau_ia, lig, col, 4);
                        if (possible4)
                            croisseur_ia--;
                    }
                    break;
            }
        }

        // affichage_ia(plateau_ia);//
        System.out.println("Tous les bateaux sont placés !");
        return plateau_ia;
    }

    public static void main(String[] args) {
        new navaL_ia().run();
    }
}
