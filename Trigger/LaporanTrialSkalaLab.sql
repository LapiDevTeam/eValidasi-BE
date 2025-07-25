 -- PRODUCT BRIEF 

CREATE OR REPLACE FUNCTION process_t_laporanTrialSkalaLab_hist() RETURNS TRIGGER AS $t_laporanTrialSkalaLab_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_laporanTrialSkalaLab_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_laporanTrialSkalaLab_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_laporanTrialSkalaLab_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_laporanTrialSkalaLab_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_laporanTrialSkalaLab_ins"
    AFTER INSERT ON "t_laporanTrialSkalaLab"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_laporanTrialSkalaLab_hist();
CREATE OR REPLACE  TRIGGER "t_laporanTrialSkalaLab_upd"
    AFTER UPDATE ON "t_laporanTrialSkalaLab"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_laporanTrialSkalaLab_hist();
CREATE  OR REPLACE  TRIGGER "t_laporanTrialSkalaLab_hist_del"
    AFTER DELETE ON "t_laporanTrialSkalaLab"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_laporanTrialSkalaLab_hist();


   -- PRODUCT BRIEF STATUS
   
  CREATE OR REPLACE FUNCTION process_t_laporanTrialSkalaLab_status_hist() 
RETURNS TRIGGER 
AS $t_laporanTrialSkalaLab_status_hist$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO "t_laporanTrialSkalaLab_status_hist"
        SELECT 'DELETED', now(), OLD.*;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO "t_laporanTrialSkalaLab_status_hist"
        SELECT 'UPDATE', now(), NEW.*;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "t_laporanTrialSkalaLab_status_hist"
        SELECT 'INSERT', now(), NEW.*;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$t_laporanTrialSkalaLab_status_hist$ LANGUAGE plpgsql;

CREATE TRIGGER t_laporanTrialSkalaLab_status_ins
    AFTER INSERT ON "t_laporanTrialSkalaLab_status"
    FOR EACH ROW 
    EXECUTE FUNCTION process_t_laporanTrialSkalaLab_status_hist();
CREATE TRIGGER t_laporanTrialSkalaLab_status_upd
    AFTER UPDATE ON "t_laporanTrialSkalaLab_status"
    FOR EACH ROW 
    EXECUTE FUNCTION process_t_laporanTrialSkalaLab_status_hist();
CREATE TRIGGER t_laporanTrialSkalaLab_status_del
    AFTER DELETE ON "t_laporanTrialSkalaLab_status"
    FOR EACH ROW 
    EXECUTE FUNCTION process_t_laporanTrialSkalaLab_status_hist();

     -- aktivitas

CREATE OR REPLACE FUNCTION process_t_aktivitasDanWaktuPencapaian_hist() RETURNS TRIGGER AS $t_aktivitasDanWaktuPencapaian_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_aktivitasDanWaktuPencapaian_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_aktivitasDanWaktuPencapaian_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_aktivitasDanWaktuPencapaian_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_aktivitasDanWaktuPencapaian_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_aktivitasDanWaktuPencapaian_ins"
    AFTER INSERT ON "t_aktivitasDanWaktuPencapaian"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_aktivitasDanWaktuPencapaian_hist();
CREATE OR REPLACE  TRIGGER "t_aktivitasDanWaktuPencapaian_upd"
    AFTER UPDATE ON "t_aktivitasDanWaktuPencapaian"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_aktivitasDanWaktuPencapaian_hist();
CREATE  OR REPLACE  TRIGGER "t_aktivitasDanWaktuPencapaian_hist_del"
    AFTER DELETE ON "t_aktivitasDanWaktuPencapaian"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_aktivitasDanWaktuPencapaian_hist();

     -- kesimpulan

CREATE OR REPLACE FUNCTION process_t_kesimpulanFormulaTerpilih_hist() RETURNS TRIGGER AS $t_kesimpulanFormulaTerpilih_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_kesimpulanFormulaTerpilih_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_kesimpulanFormulaTerpilih_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_kesimpulanFormulaTerpilih_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_kesimpulanFormulaTerpilih_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_kesimpulanFormulaTerpilih_ins"
    AFTER INSERT ON "t_kesimpulanFormulaTerpilih"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_kesimpulanFormulaTerpilih_hist();
CREATE OR REPLACE  TRIGGER "t_kesimpulanFormulaTerpilih_upd"
    AFTER UPDATE ON "t_kesimpulanFormulaTerpilih"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_kesimpulanFormulaTerpilih_hist();
CREATE  OR REPLACE  TRIGGER "t_kesimpulanFormulaTerpilih_hist_del"
    AFTER DELETE ON "t_kesimpulanFormulaTerpilih"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_kesimpulanFormulaTerpilih_hist();


 -- ringkasan hasil studi cpp

CREATE OR REPLACE FUNCTION process_t_ringkasanHasilStudiCpp_hist() RETURNS TRIGGER AS $t_ringkasanHasilStudiCpp_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_ringkasanHasilStudiCpp_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_ringkasanHasilStudiCpp_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_ringkasanHasilStudiCpp_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_ringkasanHasilStudiCpp_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_ringkasanHasilStudiCpp_ins"
    AFTER INSERT ON "t_ringkasanHasilStudiCpp"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_ringkasanHasilStudiCpp_hist();
CREATE OR REPLACE  TRIGGER "t_ringkasanHasilStudiCpp_upd"
    AFTER UPDATE ON "t_ringkasanHasilStudiCpp"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_ringkasanHasilStudiCpp_hist();
CREATE  OR REPLACE  TRIGGER "t_ringkasanHasilStudiCpp_hist_del"
    AFTER DELETE ON "t_ringkasanHasilStudiCpp"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_ringkasanHasilStudiCpp_hist();

 -- kesimpulan proses terpilih

CREATE OR REPLACE FUNCTION process_t_kesimpulanProsesTerpilih_hist() RETURNS TRIGGER AS $t_kesimpulanProsesTerpilih_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_kesimpulanProsesTerpilih_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_kesimpulanProsesTerpilih_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_kesimpulanProsesTerpilih_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_kesimpulanProsesTerpilih_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_kesimpulanProsesTerpilih_ins"
    AFTER INSERT ON "t_kesimpulanProsesTerpilih"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_kesimpulanProsesTerpilih_hist();
CREATE OR REPLACE  TRIGGER "t_kesimpulanProsesTerpilih_upd"
    AFTER UPDATE ON "t_kesimpulanProsesTerpilih"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_kesimpulanProsesTerpilih_hist();
CREATE  OR REPLACE  TRIGGER "t_kesimpulanProsesTerpilih_hist_del"
    AFTER DELETE ON "t_kesimpulanProsesTerpilih"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_kesimpulanProsesTerpilih_hist();

-- usulan penelitian produk

CREATE OR REPLACE FUNCTION process_t_usulanPenelitianProduk_hist() RETURNS TRIGGER AS $t_usulanPenelitianProduk_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_usulanPenelitianProduk_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_usulanPenelitianProduk_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_usulanPenelitianProduk_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_usulanPenelitianProduk_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_usulanPenelitianProduk_ins"
    AFTER INSERT ON "t_usulanPenelitianProduk"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_usulanPenelitianProduk_hist();
CREATE OR REPLACE  TRIGGER "t_usulanPenelitianProduk_upd"
    AFTER UPDATE ON "t_usulanPenelitianProduk"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_usulanPenelitianProduk_hist();
CREATE  OR REPLACE  TRIGGER "t_usulanPenelitianProduk_hist_del"
    AFTER DELETE ON "t_usulanPenelitianProduk"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_usulanPenelitianProduk_hist();

-- upd risk ass

CREATE OR REPLACE FUNCTION process_t_updateRiskAssessment_hist() RETURNS TRIGGER AS $t_updateRiskAssessment_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_updateRiskAssessment_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_updateRiskAssessment_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_updateRiskAssessment_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_updateRiskAssessment_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_updateRiskAssessment_ins"
    AFTER INSERT ON "t_updateRiskAssessment"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessment_hist();
CREATE OR REPLACE  TRIGGER "t_updateRiskAssessment_upd"
    AFTER UPDATE ON "t_updateRiskAssessment"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessment_hist();
CREATE  OR REPLACE  TRIGGER "t_updateRiskAssessment_hist_del"
    AFTER DELETE ON "t_updateRiskAssessment"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessment_hist();

    -- upd risk ass bahan aktif

CREATE OR REPLACE FUNCTION process_t_updateRiskAssessmentBahanAktif_hist() RETURNS TRIGGER AS $t_updateRiskAssessmentBahanAktif_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_updateRiskAssessmentBahanAktif_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_updateRiskAssessmentBahanAktif_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_updateRiskAssessmentBahanAktif_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_updateRiskAssessmentBahanAktif_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_updateRiskAssessmentBahanAktif_ins"
    AFTER INSERT ON "t_updateRiskAssessmentBahanAktif"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentBahanAktif_hist();
CREATE OR REPLACE  TRIGGER "t_updateRiskAssessmentBahanAktif_upd"
    AFTER UPDATE ON "t_updateRiskAssessmentBahanAktif"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentBahanAktif_hist();
CREATE  OR REPLACE  TRIGGER "t_updateRiskAssessmentBahanAktif_hist_del"
    AFTER DELETE ON "t_updateRiskAssessmentBahanAktif"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentBahanAktif_hist();

-- upd risk ass bahan tambahan

CREATE OR REPLACE FUNCTION process_t_updateRiskAssessmentBahanTambahan_hist() RETURNS TRIGGER AS $t_updateRiskAssessmentBahanTambahan_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_updateRiskAssessmentBahanTambahan_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_updateRiskAssessmentBahanTambahan_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_updateRiskAssessmentBahanTambahan_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_updateRiskAssessmentBahanTambahan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_updateRiskAssessmentBahanTambahan_ins"
    AFTER INSERT ON "t_updateRiskAssessmentBahanTambahan"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentBahanTambahan_hist();
CREATE OR REPLACE  TRIGGER "t_updateRiskAssessmentBahanTambahan_upd"
    AFTER UPDATE ON "t_updateRiskAssessmentBahanTambahan"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentBahanTambahan_hist();
CREATE  OR REPLACE  TRIGGER "t_updateRiskAssessmentBahanTambahan_hist_del"
    AFTER DELETE ON "t_updateRiskAssessmentBahanTambahan"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentBahanTambahan_hist();

-- updt risk ass kemasan

CREATE OR REPLACE FUNCTION process_t_updateRiskAssessmentKemasan_hist() RETURNS TRIGGER AS $t_updateRiskAssessmentKemasan_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_updateRiskAssessmentKemasan_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_updateRiskAssessmentKemasan_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_updateRiskAssessmentKemasan_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_updateRiskAssessmentKemasan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_updateRiskAssessmentKemasan_ins"
    AFTER INSERT ON "t_updateRiskAssessmentKemasan"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentKemasan_hist();
CREATE OR REPLACE  TRIGGER "t_updateRiskAssessmentKemasan_upd"
    AFTER UPDATE ON "t_updateRiskAssessmentKemasan"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentKemasan_hist();
CREATE  OR REPLACE  TRIGGER "t_updateRiskAssessmentKemasan_hist_del"
    AFTER DELETE ON "t_updateRiskAssessmentKemasan"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_updateRiskAssessmentKemasan_hist();

-- ringkasan hasil studi cma

CREATE OR REPLACE FUNCTION process_t_ringkasanHasilStudiCma_hist() RETURNS TRIGGER AS $t_ringkasanHasilStudiCma_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_ringkasanHasilStudiCma_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_ringkasanHasilStudiCma_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_ringkasanHasilStudiCma_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_ringkasanHasilStudiCma_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_ringkasanHasilStudiCma_ins"
    AFTER INSERT ON "t_ringkasanHasilStudiCma"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_ringkasanHasilStudiCma_hist();
CREATE OR REPLACE  TRIGGER "t_ringkasanHasilStudiCma_upd"
    AFTER UPDATE ON "t_ringkasanHasilStudiCma"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_ringkasanHasilStudiCma_hist();
CREATE  OR REPLACE  TRIGGER "t_ringkasanHasilStudiCma_hist_del"
    AFTER DELETE ON "t_ringkasanHasilStudiCma"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_ringkasanHasilStudiCma_hist();

-- lts studi screening

CREATE OR REPLACE FUNCTION process_t_LTS_studiScreeningSourceApi_hist() RETURNS TRIGGER AS $t_LTS_studiScreeningSourceApi_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_LTS_studiScreeningSourceApi_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_LTS_studiScreeningSourceApi_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_LTS_studiScreeningSourceApi_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_LTS_studiScreeningSourceApi_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_LTS_studiScreeningSourceApi_ins"
    AFTER INSERT ON "t_LTS_studiScreeningSourceApi"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_studiScreeningSourceApi_hist();
CREATE OR REPLACE  TRIGGER "t_LTS_studiScreeningSourceApi_upd"
    AFTER UPDATE ON "t_LTS_studiScreeningSourceApi"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_studiScreeningSourceApi_hist();
CREATE  OR REPLACE  TRIGGER "t_LTS_studiScreeningSourceApi_hist_del"
    AFTER DELETE ON "t_LTS_studiScreeningSourceApi"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_studiScreeningSourceApi_hist();

-- lts kriteria penerimaan

CREATE OR REPLACE FUNCTION process_t_LTS_kriteriaPenerimaan_hist() RETURNS TRIGGER AS $t_LTS_kriteriaPenerimaan_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_LTS_kriteriaPenerimaan_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_LTS_kriteriaPenerimaan_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_LTS_kriteriaPenerimaan_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_LTS_kriteriaPenerimaan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_LTS_kriteriaPenerimaan_ins"
    AFTER INSERT ON "t_LTS_kriteriaPenerimaan"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_kriteriaPenerimaan_hist();
CREATE OR REPLACE  TRIGGER "t_LTS_kriteriaPenerimaan_upd"
    AFTER UPDATE ON "t_LTS_kriteriaPenerimaan"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_kriteriaPenerimaan_hist();
CREATE  OR REPLACE  TRIGGER "t_LTS_kriteriaPenerimaan_hist_del"
    AFTER DELETE ON "t_LTS_kriteriaPenerimaan"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_kriteriaPenerimaan_hist();

-- lts studi cpp terhadap cqa
CREATE OR REPLACE FUNCTION process_t_LTS_studiCppTerhadapCqa_hist() RETURNS TRIGGER AS $t_LTS_studiCppTerhadapCqa_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_LTS_studiCppTerhadapCqa_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_LTS_studiCppTerhadapCqa_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_LTS_studiCppTerhadapCqa_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_LTS_studiCppTerhadapCqa_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_LTS_studiCppTerhadapCqa_ins"
    AFTER INSERT ON "t_LTS_studiCppTerhadapCqa"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_studiCppTerhadapCqa_hist();
CREATE OR REPLACE  TRIGGER "t_LTS_studiCppTerhadapCqa_upd"
    AFTER UPDATE ON "t_LTS_studiCppTerhadapCqa"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_studiCppTerhadapCqa_hist();
CREATE  OR REPLACE  TRIGGER "t_LTS_studiCppTerhadapCqa_hist_del"
    AFTER DELETE ON "t_LTS_studiCppTerhadapCqa"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_studiCppTerhadapCqa_hist();

-- bahan aktif cma

CREATE OR REPLACE FUNCTION process_t_LTS_bahanAktifCma_hist() RETURNS TRIGGER AS $t_LTS_bahanAktifCma_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_LTS_bahanAktifCma_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_LTS_bahanAktifCma_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_LTS_bahanAktifCma_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_LTS_bahanAktifCma_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_LTS_bahanAktifCma_ins"
    AFTER INSERT ON "t_LTS_bahanAktifCma"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_bahanAktifCma_hist();
CREATE OR REPLACE  TRIGGER "t_LTS_bahanAktifCma_upd"
    AFTER UPDATE ON "t_LTS_bahanAktifCma"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_bahanAktifCma_hist();
CREATE  OR REPLACE  TRIGGER "t_LTS_bahanAktifCma_hist_del"
    AFTER DELETE ON "t_LTS_bahanAktifCma"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_bahanAktifCma_hist();

-- bahan tambahan cma

CREATE OR REPLACE FUNCTION process_t_LTS_bahanTambahanCma_hist() RETURNS TRIGGER AS $t_LTS_bahanTambahanCma_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_LTS_bahanTambahanCma_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_LTS_bahanTambahanCma_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_LTS_bahanTambahanCma_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_LTS_bahanTambahanCma_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_LTS_bahanTambahanCma_ins"
    AFTER INSERT ON "t_LTS_bahanTambahanCma"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_bahanTambahanCma_hist();
CREATE OR REPLACE  TRIGGER "t_LTS_bahanTambahanCma_upd"
    AFTER UPDATE ON "t_LTS_bahanTambahanCma"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_bahanTambahanCma_hist();
CREATE  OR REPLACE  TRIGGER "t_LTS_bahanTambahanCma_hist_del"
    AFTER DELETE ON "t_LTS_bahanTambahanCma"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_bahanTambahanCma_hist();

-- hasil dan pembahasan orientasi

CREATE OR REPLACE FUNCTION process_t_LTS_hasilDanPembahasanOrientasi_hist() RETURNS TRIGGER AS $t_LTS_hasilDanPembahasanOrientasi_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_LTS_hasilDanPembahasanOrientasi_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_LTS_hasilDanPembahasanOrientasi_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_LTS_hasilDanPembahasanOrientasi_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_LTS_hasilDanPembahasanOrientasi_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_LTS_hasilDanPembahasanOrientasi_ins"
    AFTER INSERT ON "t_LTS_hasilDanPembahasanOrientasi"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_hasilDanPembahasanOrientasi_hist();
CREATE OR REPLACE  TRIGGER "t_LTS_hasilDanPembahasanOrientasi_upd"
    AFTER UPDATE ON "t_LTS_hasilDanPembahasanOrientasi"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_hasilDanPembahasanOrientasi_hist();
CREATE  OR REPLACE  TRIGGER "t_LTS_hasilDanPembahasanOrientasi_hist_del"
    AFTER DELETE ON "t_LTS_hasilDanPembahasanOrientasi"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_hasilDanPembahasanOrientasi_hist();

-- hasil pengamatan

CREATE OR REPLACE FUNCTION process_t_LTS_hasilPengamatan_hist() RETURNS TRIGGER AS $t_LTS_hasilPengamatan_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_LTS_hasilPengamatan_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_LTS_hasilPengamatan_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_LTS_hasilPengamatan_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_LTS_hasilPengamatan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_LTS_hasilPengamatan_ins"
    AFTER INSERT ON "t_LTS_hasilPengamatan"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_hasilPengamatan_hist();
CREATE OR REPLACE  TRIGGER "t_LTS_hasilPengamatan_upd"
    AFTER UPDATE ON "t_LTS_hasilPengamatan"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_hasilPengamatan_hist();
CREATE  OR REPLACE  TRIGGER "t_LTS_hasilPengamatan_hist_del"
    AFTER DELETE ON "t_LTS_hasilPengamatan"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_hasilPengamatan_hist();

-- kesimpulan proses terpilih

CREATE OR REPLACE FUNCTION process_t_LTS_tanggalPengambilanSampel_hist() RETURNS TRIGGER AS $t_LTS_tanggalPengambilanSampel_hist$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_LTS_tanggalPengambilanSampel_hist"
                SELECT 'DELETED', now() , o.*  FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_LTS_tanggalPengambilanSampel_hist"
                SELECT  'UPDATE', now() , n.*  FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_LTS_tanggalPengambilanSampel_hist"
                SELECT   'INSERT', now() , n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_LTS_tanggalPengambilanSampel_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_LTS_tanggalPengambilanSampel_ins"
    AFTER INSERT ON "t_LTS_tanggalPengambilanSampel"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_tanggalPengambilanSampel_hist();
CREATE OR REPLACE  TRIGGER "t_LTS_tanggalPengambilanSampel_upd"
    AFTER UPDATE ON "t_LTS_tanggalPengambilanSampel"
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_tanggalPengambilanSampel_hist();
CREATE  OR REPLACE  TRIGGER "t_LTS_tanggalPengambilanSampel_hist_del"
    AFTER DELETE ON "t_LTS_tanggalPengambilanSampel"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_t_LTS_tanggalPengambilanSampel_hist();




   
   