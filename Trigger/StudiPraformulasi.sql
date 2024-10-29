 -- PRODUCT BRIEF 

CREATE OR REPLACE FUNCTION process_t_productBrief_hist() RETURNS TRIGGER AS $t_productBrief_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_productBrief_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_productBrief_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_productBrief_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_productBrief_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_productBrief_ins"
    AFTER INSERT ON "t_productBrief"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_productBrief_hist();
CREATE OR REPLACE  TRIGGER "t_productBrief_upd"
    AFTER UPDATE ON "t_productBrief"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_productBrief_hist();
CREATE  OR REPLACE  TRIGGER "t_productBrief_hist_del"
    AFTER DELETE ON "t_productBrief"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_productBrief_hist();
   
   
   
   
   -- PRODUCT BRIEF STATUS
   
  CREATE OR REPLACE FUNCTION process_t_productBrief_status_hist() 
RETURNS TRIGGER 
AS $t_productBrief_status_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_productBrief_status_hist"
        SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_productBrief_status_hist"
        SELECT 'UPDATE', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_productBrief_status_hist"
        SELECT 'INSERT', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_productBrief_status_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER t_productBrief_status_ins
    AFTER INSERT ON "t_productBrief_status"
    FOR EACH ROW 
    EXECUTE FUNCTION process_t_productBrief_status_hist();
CREATE OR REPLACE TRIGGER t_productBrief_status_upd
    AFTER UPDATE ON "t_productBrief_status"
    FOR EACH ROW 
    EXECUTE FUNCTION process_t_productBrief_status_hist();
CREATE OR REPLACE TRIGGER t_productBrief_status_del
    AFTER DELETE ON "t_productBrief_status"
    FOR EACH ROW 
    EXECUTE FUNCTION process_t_productBrief_status_hist();
   
   
   -- Catatan Trial
   
CREATE OR REPLACE FUNCTION process_t_catatanTrial_hist() RETURNS TRIGGER AS $t_catatanTrial_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_catatanTrial_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_catatanTrial_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_catatanTrial_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_catatanTrial_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_catatanTrial_ins"
    AFTER INSERT ON "t_catatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_catatanTrial_hist();
CREATE OR REPLACE TRIGGER "t_catatanTrial_upd"
    AFTER UPDATE ON "t_catatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_catatanTrial_hist();
CREATE OR REPLACE TRIGGER "t_catatanTrial_del"
    AFTER DELETE ON "t_catatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_catatanTrial_hist();
   
      -- Catatan Trial status

CREATE OR REPLACE FUNCTION process_t_catatanTrial_status_hist() RETURNS TRIGGER AS $t_catatanTrial_status_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_catatanTrial_status_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_catatanTrial_status_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_catatanTrial_status_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_catatanTrial_status_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_catatanTrial_status_ins"
    AFTER INSERT ON "t_catatanTrial_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_catatanTrial_status_hist();
CREATE OR REPLACE TRIGGER "t_catatanTrial_status_upd"
    AFTER UPDATE ON "t_catatanTrial_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_catatanTrial_status_hist();
CREATE OR REPLACE TRIGGER "t_catatanTrial_status_del"
    AFTER DELETE ON "t_catatanTrial_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_catatanTrial_status_hist();
   
   
 -- KOMPOSISI CATATAN TRIAL
 
 CREATE OR REPLACE FUNCTION process_t_komposisiCatatanTrial_hist() RETURNS TRIGGER AS $t_komposisiCatatanTrial_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_komposisiCatatanTrial_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_komposisiCatatanTrial_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_komposisiCatatanTrial_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_komposisiCatatanTrial_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_komposisiCatatanTrial_ins"
    AFTER INSERT ON "t_komposisiCatatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_komposisiCatatanTrial_hist();
CREATE OR REPLACE TRIGGER "t_komposisiCatatanTrial_upd"
    AFTER UPDATE ON "t_komposisiCatatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_komposisiCatatanTrial_hist();
CREATE OR REPLACE TRIGGER "t_komposisiCatatanTrial_del"
    AFTER DELETE ON "t_komposisiCatatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_komposisiCatatanTrial_hist();
   
   
   -- PERHITUNGAN ZAT AKTIF
   
   CREATE OR REPLACE FUNCTION process_t_perhitunganZatAktif_hist() RETURNS TRIGGER AS $t_perhitunganZatAktif_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_perhitunganZatAktif_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_perhitunganZatAktif_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_perhitunganZatAktif_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_perhitunganZatAktif_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_perhitunganZatAktif_ins"
AFTER INSERT ON "t_perhitunganZatAktif"
FOR EACH ROW EXECUTE FUNCTION process_t_perhitunganZatAktif_hist();
CREATE OR REPLACE TRIGGER "t_perhitunganZatAktif_upd"
AFTER UPDATE ON "t_perhitunganZatAktif"
FOR EACH ROW EXECUTE FUNCTION process_t_perhitunganZatAktif_hist();
CREATE OR REPLACE TRIGGER "t_perhitunganZatAktif_del"
AFTER DELETE ON "t_perhitunganZatAktif"
FOR EACH ROW EXECUTE FUNCTION process_t_perhitunganZatAktif_hist();

 -- FORMULA CATATAN TRIAL

CREATE OR REPLACE FUNCTION process_t_formulaCatatanTrial_hist() RETURNS TRIGGER AS $t_formulaCatatanTrial_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_formulaCatatanTrial_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_formulaCatatanTrial_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_formulaCatatanTrial_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_formulaCatatanTrial_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaCatatanTrial_ins"
AFTER INSERT ON "t_formulaCatatanTrial"
FOR EACH ROW EXECUTE FUNCTION process_t_formulaCatatanTrial_hist();
CREATE OR REPLACE TRIGGER "t_formulaCatatanTrial_upd"
AFTER UPDATE ON "t_formulaCatatanTrial"
FOR EACH ROW EXECUTE FUNCTION process_t_formulaCatatanTrial_hist();
CREATE OR REPLACE TRIGGER "t_formulaCatatanTrial_del"
AFTER DELETE ON "t_formulaCatatanTrial"
FOR EACH ROW EXECUTE FUNCTION process_t_formulaCatatanTrial_hist();

-- METODE  PEMBUATAN

CREATE OR REPLACE FUNCTION process_t_metodePembuatan_hist() RETURNS TRIGGER AS $t_metodePembuatan_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_metodePembuatan_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_metodePembuatan_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_metodePembuatan_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_metodePembuatan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_metodePembuatan_ins"
AFTER INSERT ON "t_metodePembuatan"
FOR EACH ROW EXECUTE FUNCTION process_t_metodePembuatan_hist();
CREATE OR REPLACE TRIGGER "t_metodePembuatan_upd"
AFTER UPDATE ON "t_metodePembuatan"
FOR EACH ROW EXECUTE FUNCTION process_t_metodePembuatan_hist();
CREATE OR REPLACE TRIGGER "t_metodePembuatan_del"
AFTER DELETE ON "t_metodePembuatan"
FOR EACH ROW EXECUTE FUNCTION process_t_metodePembuatan_hist();

-- PENGAMATAN AWAL CAIR

CREATE OR REPLACE FUNCTION process_t_pengamatanAwalCair_hist() RETURNS TRIGGER AS $t_pengamatanAwalCair_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_pengamatanAwalCair_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_pengamatanAwalCair_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_pengamatanAwalCair_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_pengamatanAwalCair_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_pengamatanAwalCair_ins"
AFTER INSERT ON "t_pengamatanAwalCair"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalCair_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanAwalCair_upd"
AFTER UPDATE ON "t_pengamatanAwalCair"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalCair_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanAwalCair_del"
AFTER DELETE ON "t_pengamatanAwalCair"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalCair_hist();

-- PENGAMATAN AWAL PADAT

CREATE OR REPLACE FUNCTION process_t_pengamatanAwalPadat_hist() RETURNS TRIGGER AS $t_pengamatanAwalPadat_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_pengamatanAwalPadat_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_pengamatanAwalPadat_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_pengamatanAwalPadat_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_pengamatanAwalPadat_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_pengamatanAwalPadat_ins"
AFTER INSERT ON "t_pengamatanAwalPadat"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalPadat_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanAwalPadat_upd"
AFTER UPDATE ON "t_pengamatanAwalPadat"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalPadat_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanAwalPadat_del"
AFTER DELETE ON "t_pengamatanAwalPadat"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalPadat_hist();

-- PENGAMATAN AWAL STERIL

CREATE OR REPLACE FUNCTION process_t_pengamatanAwalSteril_hist() RETURNS TRIGGER AS $t_pengamatanAwalSteril_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_pengamatanAwalSteril_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_pengamatanAwalSteril_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_pengamatanAwalSteril_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_pengamatanAwalSteril_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_pengamatanAwalSteril_ins"
AFTER INSERT ON "t_pengamatanAwalSteril"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalSteril_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanAwalSteril_upd"
AFTER UPDATE ON "t_pengamatanAwalSteril"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalSteril_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanAwalSteril_del"
AFTER DELETE ON "t_pengamatanAwalSteril"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalSteril_hist();

-- PENGAMATAN AWAL PENYALUTAN

CREATE OR REPLACE FUNCTION process_t_pengamatanAwalPenyalutan_hist() RETURNS TRIGGER AS $t_pengamatanAwalPenyalutan_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_pengamatanAwalPenyalutan_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_pengamatanAwalPenyalutan_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_pengamatanAwalPenyalutan_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_pengamatanAwalPenyalutan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_pengamatanAwalPenyalutan_ins"
AFTER INSERT ON "t_pengamatanAwalPenyalutan"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalPenyalutan_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanAwalPenyalutan_upd"
AFTER UPDATE ON "t_pengamatanAwalPenyalutan"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalPenyalutan_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanAwalPenyalutan_del"
AFTER DELETE ON "t_pengamatanAwalPenyalutan"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanAwalPenyalutan_hist();
   

-- PENGAMATAN AWAL LANJUTAN

CREATE OR REPLACE FUNCTION process_t_pengamatanLanjutan_hist() RETURNS TRIGGER AS $t_pengamatanLanjutan_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_pengamatanLanjutan_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_pengamatanLanjutan_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_pengamatanLanjutan_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_pengamatanLanjutan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_pengamatanLanjutan_ins"
AFTER INSERT ON "t_pengamatanLanjutan"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanLanjutan_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanLanjutan_upd"
AFTER UPDATE ON "t_pengamatanLanjutan"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanLanjutan_hist();
CREATE OR REPLACE TRIGGER "t_pengamatanLanjutan_del"
AFTER DELETE ON "t_pengamatanLanjutan"
FOR EACH ROW EXECUTE FUNCTION process_t_pengamatanLanjutan_hist();


-- PROSES CATATAN TRIAL PADAT


CREATE OR REPLACE FUNCTION process_t_prosesCatatanTrialPadat_hist() RETURNS TRIGGER AS $t_prosesCatatanTrialPadat_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_prosesCatatanTrialPadat_hist"
            SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_prosesCatatanTrialPadat_hist"
            SELECT 'UPDATED', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_prosesCatatanTrialPadat_hist"
            SELECT 'INSERTED', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_prosesCatatanTrialPadat_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_prosesCatatanTrialPadat_ins"
AFTER INSERT ON "t_prosesCatatanTrialPadat"
FOR EACH ROW EXECUTE FUNCTION process_t_prosesCatatanTrialPadat_hist();
CREATE OR REPLACE TRIGGER "t_prosesCatatanTrialPadat_upd"
AFTER UPDATE ON "t_prosesCatatanTrialPadat"
FOR EACH ROW EXECUTE FUNCTION process_t_prosesCatatanTrialPadat_hist();
CREATE OR REPLACE TRIGGER "t_prosesCatatanTrialPadat_del"
AFTER DELETE ON "t_prosesCatatanTrialPadat"
FOR EACH ROW EXECUTE FUNCTION process_t_prosesCatatanTrialPadat_hist();


   -- studi praformulasi
   
CREATE OR REPLACE FUNCTION process_t_studiPraformulasi_hist() RETURNS TRIGGER AS $t_studiPraformulasi_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_studiPraformulasi_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_studiPraformulasi_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_studiPraformulasi_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_studiPraformulasi_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_studiPraformulasi_ins"
    AFTER INSERT ON "t_studiPraformulasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPraformulasi_hist();
CREATE OR REPLACE TRIGGER "t_studiPraformulasi_upd"
    AFTER UPDATE ON "t_studiPraformulasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPraformulasi_hist();
CREATE OR REPLACE TRIGGER "t_studiPraformulasi_del"
    AFTER DELETE ON "t_studiPraformulasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPraformulasi_hist();

       -- studi praformulasi status
   
CREATE OR REPLACE FUNCTION process_t_studiPraformulasi_status_hist() RETURNS TRIGGER AS $t_studiPraformulasi_status_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_studiPraformulasi_status_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_studiPraformulasi_status_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_studiPraformulasi_status_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_studiPraformulasi_status_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_studiPraformulasi_status_ins"
    AFTER INSERT ON "t_studiPraformulasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPraformulasi_status_hist();
CREATE OR REPLACE TRIGGER "t_studiPraformulasi_status_upd"
    AFTER UPDATE ON "t_studiPraformulasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPraformulasi_status_hist();
CREATE OR REPLACE TRIGGER "t_studiPraformulasi_status_del"
    AFTER DELETE ON "t_studiPraformulasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPraformulasi_status_hist();

      -- deskripsi product
   
CREATE OR REPLACE FUNCTION process_t_deskripsiProduct_hist() RETURNS TRIGGER AS $t_deskripsiProduct_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_deskripsiProduct_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_deskripsiProduct_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_deskripsiProduct_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_deskripsiProduct_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_deskripsiProduct_ins"
    AFTER INSERT ON "t_deskripsiProduct"
    FOR EACH ROW EXECUTE FUNCTION process_t_deskripsiProduct_hist();
CREATE OR REPLACE TRIGGER "t_deskripsiProduct_upd"
    AFTER UPDATE ON "t_deskripsiProduct"
    FOR EACH ROW EXECUTE FUNCTION process_t_deskripsiProduct_hist();
CREATE OR REPLACE TRIGGER "t_deskripsiProduct_del"
    AFTER DELETE ON "t_deskripsiProduct"
    FOR EACH ROW EXECUTE FUNCTION process_t_deskripsiProduct_hist();

     -- deskripsi product
   
CREATE OR REPLACE FUNCTION process_t_deskripsiProduct_hist() RETURNS TRIGGER AS $t_deskripsiProduct_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_deskripsiProduct_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_deskripsiProduct_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_deskripsiProduct_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_deskripsiProduct_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_deskripsiProduct_ins"
    AFTER INSERT ON "t_deskripsiProduct"
    FOR EACH ROW EXECUTE FUNCTION process_t_deskripsiProduct_hist();
CREATE OR REPLACE TRIGGER "t_deskripsiProduct_upd"
    AFTER UPDATE ON "t_deskripsiProduct"
    FOR EACH ROW EXECUTE FUNCTION process_t_deskripsiProduct_hist();
CREATE OR REPLACE TRIGGER "t_deskripsiProduct_del"
    AFTER DELETE ON "t_deskripsiProduct"
    FOR EACH ROW EXECUTE FUNCTION process_t_deskripsiProduct_hist();

      -- farmakologi klinis
   
CREATE OR REPLACE FUNCTION process_t_farmakologiKlinis_hist() RETURNS TRIGGER AS $t_farmakologiKlinis_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_farmakologiKlinis_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_farmakologiKlinis_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_farmakologiKlinis_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_farmakologiKlinis_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_farmakologiKlinis_ins"
    AFTER INSERT ON "t_farmakologiKlinis"
    FOR EACH ROW EXECUTE FUNCTION process_t_farmakologiKlinis_hist();
CREATE OR REPLACE TRIGGER "t_farmakologiKlinis_upd"
    AFTER UPDATE ON "t_farmakologiKlinis"
    FOR EACH ROW EXECUTE FUNCTION process_t_farmakologiKlinis_hist();
CREATE OR REPLACE TRIGGER "t_farmakologiKlinis_del"
    AFTER DELETE ON "t_farmakologiKlinis"
    FOR EACH ROW EXECUTE FUNCTION process_t_farmakologiKlinis_hist();

        -- formula
   
CREATE OR REPLACE FUNCTION process_t_formula_hist() RETURNS TRIGGER AS $t_formula_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formula_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formula_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formula_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formula_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formula_ins"
    AFTER INSERT ON "t_formula"
    FOR EACH ROW EXECUTE FUNCTION process_t_formula_hist();
CREATE OR REPLACE TRIGGER "t_formula_upd"
    AFTER UPDATE ON "t_formula"
    FOR EACH ROW EXECUTE FUNCTION process_t_formula_hist();
CREATE OR REPLACE TRIGGER "t_formula_del"
    AFTER DELETE ON "t_formula"
    FOR EACH ROW EXECUTE FUNCTION process_t_formula_hist();


     -- kemasan
   
CREATE OR REPLACE FUNCTION process_t_kemasan_hist() RETURNS TRIGGER AS $t_kemasan_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_kemasan_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_kemasan_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_kemasan_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_kemasan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_kemasan_ins"
    AFTER INSERT ON "t_kemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasan_hist();
CREATE OR REPLACE TRIGGER "t_kemasan_upd"
    AFTER UPDATE ON "t_kemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasan_hist();
CREATE OR REPLACE TRIGGER "t_kemasan_del"
    AFTER DELETE ON "t_kemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasan_hist();

         -- stabilita
   
CREATE OR REPLACE FUNCTION process_t_stabilita_hist() RETURNS TRIGGER AS $t_stabilita_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_stabilita_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_stabilita_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_stabilita_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_stabilita_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_stabilita_ins"
    AFTER INSERT ON "t_stabilita"
    FOR EACH ROW EXECUTE FUNCTION process_t_stabilita_hist();
CREATE OR REPLACE TRIGGER "t_stabilita_upd"
    AFTER UPDATE ON "t_stabilita"
    FOR EACH ROW EXECUTE FUNCTION process_t_stabilita_hist();
CREATE OR REPLACE TRIGGER "t_stabilita_del"
    AFTER DELETE ON "t_stabilita"
    FOR EACH ROW EXECUTE FUNCTION process_t_stabilita_hist();

       -- karakteristik fisika kimia
   
CREATE OR REPLACE FUNCTION process_t_karakteristikFisikakimia_hist() RETURNS TRIGGER AS $t_karakteristikFisikakimia_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_karakteristikFisikakimia_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_karakteristikFisikakimia_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_karakteristikFisikakimia_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_karakteristikFisikakimia_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_karakteristikFisikakimia_ins"
    AFTER INSERT ON "t_karakteristikFisikakimia"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikFisikakimia_hist();
CREATE OR REPLACE TRIGGER "t_karakteristikFisikakimia_upd"
    AFTER UPDATE ON "t_karakteristikFisikakimia"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikFisikakimia_hist();
CREATE OR REPLACE TRIGGER "t_karakteristikFisikakimia_del"
    AFTER DELETE ON "t_karakteristikFisikakimia"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikFisikakimia_hist();
   
   
           -- karakteristik bahan aktif
   
CREATE OR REPLACE FUNCTION process_t_karakteristikBahanAktif_hist() RETURNS TRIGGER AS $t_karakteristikBahanAktif_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_karakteristikBahanAktif_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_karakteristikBahanAktif_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_karakteristikBahanAktif_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_karakteristikBahanAktif_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_karakteristikBahanAktif_ins"
    AFTER INSERT ON "t_karakteristikBahanAktif"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanAktif_hist();
CREATE OR REPLACE TRIGGER "t_karakteristikBahanAktif_upd"
    AFTER UPDATE ON "t_karakteristikBahanAktif"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanAktif_hist();
CREATE OR REPLACE TRIGGER "t_karakteristikBahanAktif_del"
    AFTER DELETE ON "t_karakteristikBahanAktif"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanAktif_hist();

          -- karakteristik bahan tambahan
   
CREATE OR REPLACE FUNCTION process_t_karakteristikBahanTambahan_hist() RETURNS TRIGGER AS $t_karakteristikBahanTambahan_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_karakteristikBahanTambahan_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_karakteristikBahanTambahan_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_karakteristikBahanTambahan_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_karakteristikBahanTambahan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_karakteristikBahanTambahan_ins"
    AFTER INSERT ON "t_karakteristikBahanTambahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanTambahan_hist();
CREATE OR REPLACE TRIGGER "t_karakteristikBahanTambahan_upd"
    AFTER UPDATE ON "t_karakteristikBahanTambahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanTambahan_hist();
CREATE OR REPLACE TRIGGER "t_karakteristikBahanTambahan_del"
    AFTER DELETE ON "t_karakteristikBahanTambahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanTambahan_hist();

           -- karakteristik bahan kemasan
   
CREATE OR REPLACE FUNCTION process_t_karakteristikBahanKemasan_hist() RETURNS TRIGGER AS $t_karakteristikBahanKemasan_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_karakteristikBahanKemasan_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_karakteristikBahanKemasan_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_karakteristikBahanKemasan_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_karakteristikBahanKemasan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_karakteristikBahanKemasan_ins"
    AFTER INSERT ON "t_karakteristikBahanKemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanKemasan_hist();
CREATE OR REPLACE TRIGGER "t_karakteristikBahanKemasan_upd"
    AFTER UPDATE ON "t_karakteristikBahanKemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanKemasan_hist();
CREATE OR REPLACE TRIGGER "t_karakteristikBahanKemasan_del"
    AFTER DELETE ON "t_karakteristikBahanKemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_karakteristikBahanKemasan_hist();

           -- studi paten
   
CREATE OR REPLACE FUNCTION process_t_studiPaten_hist() RETURNS TRIGGER AS $t_studiPaten_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_studiPaten_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_studiPaten_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_studiPaten_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_studiPaten_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_studiPaten_ins"
    AFTER INSERT ON "t_studiPaten"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPaten_hist();
CREATE OR REPLACE TRIGGER "t_studiPaten_upd"
    AFTER UPDATE ON "t_studiPaten"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPaten_hist();
CREATE OR REPLACE TRIGGER "t_studiPaten_del"
    AFTER DELETE ON "t_studiPaten"
    FOR EACH ROW EXECUTE FUNCTION process_t_studiPaten_hist();

             -- uji inkompatibilitas
   
CREATE OR REPLACE FUNCTION process_t_ujiInkompatibilitas_hist() RETURNS TRIGGER AS $t_ujiInkompatibilitas_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_ujiInkompatibilitas_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_ujiInkompatibilitas_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_ujiInkompatibilitas_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_ujiInkompatibilitas_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_ujiInkompatibilitas_ins"
    AFTER INSERT ON "t_ujiInkompatibilitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_ujiInkompatibilitas_hist();
CREATE OR REPLACE TRIGGER "t_ujiInkompatibilitas_upd"
    AFTER UPDATE ON "t_ujiInkompatibilitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_ujiInkompatibilitas_hist();
CREATE OR REPLACE TRIGGER "t_ujiInkompatibilitas_del"
    AFTER DELETE ON "t_ujiInkompatibilitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_ujiInkompatibilitas_hist();

                 -- qtpp
   
CREATE OR REPLACE FUNCTION process_t_qtpp_hist() RETURNS TRIGGER AS $t_qtpp_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_qtpp_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_qtpp_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_qtpp_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_qtpp_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_qtpp_ins"
    AFTER INSERT ON "t_qtpp"
    FOR EACH ROW EXECUTE FUNCTION process_t_qtpp_hist();
CREATE OR REPLACE TRIGGER "t_qtpp_upd"
    AFTER UPDATE ON "t_qtpp"
    FOR EACH ROW EXECUTE FUNCTION process_t_qtpp_hist();
CREATE OR REPLACE TRIGGER "t_qtpp_del"
    AFTER DELETE ON "t_qtpp"
    FOR EACH ROW EXECUTE FUNCTION process_t_qtpp_hist();

            -- cqa
   
CREATE OR REPLACE FUNCTION process_t_cqa_hist() RETURNS TRIGGER AS $t_cqa_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_cqa_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_cqa_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_cqa_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_cqa_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_cqa_ins"
    AFTER INSERT ON "t_cqa"
    FOR EACH ROW EXECUTE FUNCTION process_t_cqa_hist();
CREATE OR REPLACE TRIGGER "t_cqa_upd"
    AFTER UPDATE ON "t_cqa"
    FOR EACH ROW EXECUTE FUNCTION process_t_cqa_hist();
CREATE OR REPLACE TRIGGER "t_cqa_del"
    AFTER DELETE ON "t_cqa"
    FOR EACH ROW EXECUTE FUNCTION process_t_cqa_hist();

         -- formula protokol
   
CREATE OR REPLACE FUNCTION process_t_formulaProtokol_hist() RETURNS TRIGGER AS $t_formulaProtokol_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formulaProtokol_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formulaProtokol_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formulaProtokol_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formulaProtokol_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaProtokol_ins"
    AFTER INSERT ON "t_formulaProtokol"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaProtokol_hist();
CREATE OR REPLACE TRIGGER "t_formulaProtokol_upd"
    AFTER UPDATE ON "t_formulaProtokol"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaProtokol_hist();
CREATE OR REPLACE TRIGGER "t_formulaProtokol_del"
    AFTER DELETE ON "t_formulaProtokol"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaProtokol_hist();

       -- proses pembuatan
   
CREATE OR REPLACE FUNCTION process_t_prosesPembuatan_hist() RETURNS TRIGGER AS $t_prosesPembuatan_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_prosesPembuatan_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_prosesPembuatan_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_prosesPembuatan_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_prosesPembuatan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_prosesPembuatan_ins"
    AFTER INSERT ON "t_prosesPembuatan"
    FOR EACH ROW EXECUTE FUNCTION process_t_prosesPembuatan_hist();
CREATE OR REPLACE TRIGGER "t_prosesPembuatan_upd"
    AFTER UPDATE ON "t_prosesPembuatan"
    FOR EACH ROW EXECUTE FUNCTION process_t_prosesPembuatan_hist();
CREATE OR REPLACE TRIGGER "t_prosesPembuatan_del"
    AFTER DELETE ON "t_prosesPembuatan"
    FOR EACH ROW EXECUTE FUNCTION process_t_prosesPembuatan_hist();

    -- kemasan protokol skala lab
   
CREATE OR REPLACE FUNCTION process_t_kemasanProtokolSkalaLab_hist() RETURNS TRIGGER AS $t_kemasanProtokolSkalaLab_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_kemasanProtokolSkalaLab_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_kemasanProtokolSkalaLab_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_kemasanProtokolSkalaLab_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_kemasanProtokolSkalaLab_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_kemasanProtokolSkalaLab_ins"
    AFTER INSERT ON "t_kemasanProtokolSkalaLab"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanProtokolSkalaLab_hist();
CREATE OR REPLACE TRIGGER "t_kemasanProtokolSkalaLab_upd"
    AFTER UPDATE ON "t_kemasanProtokolSkalaLab"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanProtokolSkalaLab_hist();
CREATE OR REPLACE TRIGGER "t_kemasanProtokolSkalaLab_del"
    AFTER DELETE ON "t_kemasanProtokolSkalaLab"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanProtokolSkalaLab_hist();

     -- zat aktif
   
CREATE OR REPLACE FUNCTION process_t_zatAktif_hist() RETURNS TRIGGER AS $t_zatAktif_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_zatAktif_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_zatAktif_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_zatAktif_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_zatAktif_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_zatAktif_ins"
    AFTER INSERT ON "t_zatAktif"
    FOR EACH ROW EXECUTE FUNCTION process_t_zatAktif_hist();
CREATE OR REPLACE TRIGGER "t_zatAktif_upd"
    AFTER UPDATE ON "t_zatAktif"
    FOR EACH ROW EXECUTE FUNCTION process_t_zatAktif_hist();
CREATE OR REPLACE TRIGGER "t_zatAktif_del"
    AFTER DELETE ON "t_zatAktif"
    FOR EACH ROW EXECUTE FUNCTION process_t_zatAktif_hist();

        -- bahan tambahan
   
CREATE OR REPLACE FUNCTION process_t_bahanTambahan_hist() RETURNS TRIGGER AS $t_bahanTambahan_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_bahanTambahan_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_bahanTambahan_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_bahanTambahan_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_bahanTambahan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_bahanTambahan_ins"
    AFTER INSERT ON "t_bahanTambahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_bahanTambahan_hist();
CREATE OR REPLACE TRIGGER "t_bahanTambahan_upd"
    AFTER UPDATE ON "t_bahanTambahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_bahanTambahan_hist();
CREATE OR REPLACE TRIGGER "t_bahanTambahan_del"
    AFTER DELETE ON "t_bahanTambahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_bahanTambahan_hist();


  -- kemasan primer
   
CREATE OR REPLACE FUNCTION process_t_kemasanPrimer_hist() RETURNS TRIGGER AS $t_kemasanPrimer_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_kemasanPrimer_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_kemasanPrimer_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_kemasanPrimer_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_kemasanPrimer_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_kemasanPrimer_ins"
    AFTER INSERT ON "t_kemasanPrimer"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanPrimer_hist();
CREATE OR REPLACE TRIGGER "t_kemasanPrimer_upd"
    AFTER UPDATE ON "t_kemasanPrimer"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanPrimer_hist();
CREATE OR REPLACE TRIGGER "t_kemasanPrimer_del"
    AFTER DELETE ON "t_kemasanPrimer"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanPrimer_hist();

      -- mapping process
   
CREATE OR REPLACE FUNCTION process_t_mappingProcess_hist() RETURNS TRIGGER AS $t_mappingProcess_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_mappingProcess_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_mappingProcess_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_mappingProcess_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_mappingProcess_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_mappingProcess_ins"
    AFTER INSERT ON "t_mappingProcess"
    FOR EACH ROW EXECUTE FUNCTION process_t_mappingProcess_hist();
CREATE OR REPLACE TRIGGER "t_mappingProcess_upd"
    AFTER UPDATE ON "t_mappingProcess"
    FOR EACH ROW EXECUTE FUNCTION process_t_mappingProcess_hist();
CREATE OR REPLACE TRIGGER "t_mappingProcess_del"
    AFTER DELETE ON "t_mappingProcess"
    FOR EACH ROW EXECUTE FUNCTION process_t_mappingProcess_hist();

         -- cpp
   
CREATE OR REPLACE FUNCTION process_t_cpp_hist() RETURNS TRIGGER AS $t_cpp_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_cpp_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_cpp_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_cpp_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_cpp_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_cpp_ins"
    AFTER INSERT ON "t_cpp"
    FOR EACH ROW EXECUTE FUNCTION process_t_cpp_hist();
CREATE OR REPLACE TRIGGER "t_cpp_upd"
    AFTER UPDATE ON "t_cpp"
    FOR EACH ROW EXECUTE FUNCTION process_t_cpp_hist();
CREATE OR REPLACE TRIGGER "t_cpp_del"
    AFTER DELETE ON "t_cpp"
    FOR EACH ROW EXECUTE FUNCTION process_t_cpp_hist();

       -- rencana aktivitas
   
CREATE OR REPLACE FUNCTION process_t_rencanaAktivitas_hist() RETURNS TRIGGER AS $t_rencanaAktivitas_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_rencanaAktivitas_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_rencanaAktivitas_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_rencanaAktivitas_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_rencanaAktivitas_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_rencanaAktivitas_ins"
    AFTER INSERT ON "t_rencanaAktivitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_rencanaAktivitas_hist();
CREATE OR REPLACE TRIGGER "t_rencanaAktivitas_upd"
    AFTER UPDATE ON "t_rencanaAktivitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_rencanaAktivitas_hist();
CREATE OR REPLACE TRIGGER "t_rencanaAktivitas_del"
    AFTER DELETE ON "t_rencanaAktivitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_rencanaAktivitas_hist();

          -- material
   
CREATE OR REPLACE FUNCTION process_t_material_hist() RETURNS TRIGGER AS $t_material_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_material_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_material_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_material_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_material_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_material_ins"
    AFTER INSERT ON "t_material"
    FOR EACH ROW EXECUTE FUNCTION process_t_material_hist();
CREATE OR REPLACE TRIGGER "t_material_upd"
    AFTER UPDATE ON "t_material"
    FOR EACH ROW EXECUTE FUNCTION process_t_material_hist();
CREATE OR REPLACE TRIGGER "t_material_del"
    AFTER DELETE ON "t_material"
    FOR EACH ROW EXECUTE FUNCTION process_t_material_hist();


          -- originator atau kompetitor
   
CREATE OR REPLACE FUNCTION process_t_originatorAtauKompetitor_hist() RETURNS TRIGGER AS $t_originatorAtauKompetitor_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_originatorAtauKompetitor_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_originatorAtauKompetitor_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_originatorAtauKompetitor_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_originatorAtauKompetitor_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_originatorAtauKompetitor_ins"
    AFTER INSERT ON "t_originatorAtauKompetitor"
    FOR EACH ROW EXECUTE FUNCTION process_t_originatorAtauKompetitor_hist();
CREATE OR REPLACE TRIGGER "t_originatorAtauKompetitor_upd"
    AFTER UPDATE ON "t_originatorAtauKompetitor"
    FOR EACH ROW EXECUTE FUNCTION process_t_originatorAtauKompetitor_hist();
CREATE OR REPLACE TRIGGER "t_originatorAtauKompetitor_del"
    AFTER DELETE ON "t_originatorAtauKompetitor"
    FOR EACH ROW EXECUTE FUNCTION process_t_originatorAtauKompetitor_hist();


          -- kebutuhan peralatan dan mesin
   
CREATE OR REPLACE FUNCTION process_t_kebutuhanPeralatanDanMesin_hist() RETURNS TRIGGER AS $t_kebutuhanPeralatanDanMesin_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_kebutuhanPeralatanDanMesin_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_kebutuhanPeralatanDanMesin_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_kebutuhanPeralatanDanMesin_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_kebutuhanPeralatanDanMesin_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_kebutuhanPeralatanDanMesin_ins"
    AFTER INSERT ON "t_kebutuhanPeralatanDanMesin"
    FOR EACH ROW EXECUTE FUNCTION process_t_kebutuhanPeralatanDanMesin_hist();
CREATE OR REPLACE TRIGGER "t_kebutuhanPeralatanDanMesin_upd"
    AFTER UPDATE ON "t_kebutuhanPeralatanDanMesin"
    FOR EACH ROW EXECUTE FUNCTION process_t_kebutuhanPeralatanDanMesin_hist();
CREATE OR REPLACE TRIGGER "t_kebutuhanPeralatanDanMesin_del"
    AFTER DELETE ON "t_kebutuhanPeralatanDanMesin"
    FOR EACH ROW EXECUTE FUNCTION process_t_kebutuhanPeralatanDanMesin_hist();

       -- matrix perbandingan
   
CREATE OR REPLACE FUNCTION process_t_matrixPerbandingan_hist() RETURNS TRIGGER AS $t_matrixPerbandingan_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_matrixPerbandingan_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_matrixPerbandingan_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_matrixPerbandingan_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_matrixPerbandingan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_matrixPerbandingan_ins"
    AFTER INSERT ON "t_matrixPerbandingan"
    FOR EACH ROW EXECUTE FUNCTION process_t_matrixPerbandingan_hist();
CREATE OR REPLACE TRIGGER "t_matrixPerbandingan_upd"
    AFTER UPDATE ON "t_matrixPerbandingan"
    FOR EACH ROW EXECUTE FUNCTION process_t_matrixPerbandingan_hist();
CREATE OR REPLACE TRIGGER "t_matrixPerbandingan_del"
    AFTER DELETE ON "t_matrixPerbandingan"
    FOR EACH ROW EXECUTE FUNCTION process_t_matrixPerbandingan_hist();


    -- EVALUASI BULK
   
CREATE OR REPLACE FUNCTION process_t_evaluasiBulk_hist() RETURNS TRIGGER AS $t_evaluasiBulk_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_evaluasiBulk_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_evaluasiBulk_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_evaluasiBulk_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_evaluasiBulk_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_evaluasiBulk_ins"
    AFTER INSERT ON "t_evaluasiBulk"
    FOR EACH ROW EXECUTE FUNCTION process_t_evaluasiBulk_hist();
CREATE OR REPLACE TRIGGER "t_evaluasiBulk_upd"
    AFTER UPDATE ON "t_evaluasiBulk"
    FOR EACH ROW EXECUTE FUNCTION process_t_evaluasiBulk_hist();
CREATE OR REPLACE TRIGGER "t_evaluasiBulk_del"
    AFTER DELETE ON "t_evaluasiBulk"
    FOR EACH ROW EXECUTE FUNCTION process_t_evaluasiBulk_hist();
    -- Distribusi ukuran partikel
   
CREATE OR REPLACE FUNCTION process_t_distribusiUkuranPartikel_hist() RETURNS TRIGGER AS $t_distribusiUkuranPartikel_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_distribusiUkuranPartikel_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_distribusiUkuranPartikel_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_distribusiUkuranPartikel_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_distribusiUkuranPartikel_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_distribusiUkuranPartikel_ins"
    AFTER INSERT ON "t_distribusiUkuranPartikel"
    FOR EACH ROW EXECUTE FUNCTION process_t_distribusiUkuranPartikel_hist();
CREATE OR REPLACE TRIGGER "t_distribusiUkuranPartikel_upd"
    AFTER UPDATE ON "t_distribusiUkuranPartikel"
    FOR EACH ROW EXECUTE FUNCTION process_t_distribusiUkuranPartikel_hist();
CREATE OR REPLACE TRIGGER "t_distribusiUkuranPartikel_del"
    AFTER DELETE ON "t_distribusiUkuranPartikel"
    FOR EACH ROW EXECUTE FUNCTION process_t_distribusiUkuranPartikel_hist();



