  -- T_FORMULA_FIX
   
CREATE OR REPLACE FUNCTION process_t_formulaFix_hist() RETURNS TRIGGER AS $t_formulaFix_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formulaFix_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formulaFix_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formulaFix_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formulaFix_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaFix_ins"
    AFTER INSERT ON "t_formulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_upd"
    AFTER UPDATE ON "t_formulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_del"
    AFTER DELETE ON "t_formulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_hist();

  -- T_FORMULA_FIX_STATUS
   
CREATE OR REPLACE FUNCTION process_t_formulaFix_status_hist() RETURNS TRIGGER AS $t_formulaFix_status_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formulaFix_status_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formulaFix_status_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formulaFix_status_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formulaFix_status_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaFix_status_ins"
    AFTER INSERT ON "t_formulaFix_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_status_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_status_upd"
    AFTER UPDATE ON "t_formulaFix_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_status_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_status_del"
    AFTER DELETE ON "t_formulaFix_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_status_hist();

      -- T_PERHITUNGAN BAHAN BAKU FORMULA FIX
   
CREATE OR REPLACE FUNCTION process_t_perhitunganBahanBakuFormulaFix_hist() RETURNS TRIGGER AS $t_perhitunganBahanBakuFormulaFix_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_perhitunganBahanBakuFormulaFix_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_perhitunganBahanBakuFormulaFix_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_perhitunganBahanBakuFormulaFix_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_perhitunganBahanBakuFormulaFix_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_perhitunganBahanBakuFormulaFix_ins"
    AFTER INSERT ON "t_perhitunganBahanBakuFormulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_perhitunganBahanBakuFormulaFix_hist();
CREATE OR REPLACE TRIGGER "t_perhitunganBahanBakuFormulaFix_upd"
    AFTER UPDATE ON "t_perhitunganBahanBakuFormulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_perhitunganBahanBakuFormulaFix_hist();
CREATE OR REPLACE TRIGGER "t_perhitunganBahanBakuFormulaFix_del"
    AFTER DELETE ON "t_perhitunganBahanBakuFormulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_perhitunganBahanBakuFormulaFix_hist();

      -- T_KEMASAN FORMULA FIX
   
CREATE OR REPLACE FUNCTION process_t_kemasanFormulaFix_hist() RETURNS TRIGGER AS $t_kemasanFormulaFix_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_kemasanFormulaFix_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_kemasanFormulaFix_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_kemasanFormulaFix_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_kemasanFormulaFix_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_kemasanFormulaFix_ins"
    AFTER INSERT ON "t_kemasanFormulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanFormulaFix_hist();
CREATE OR REPLACE TRIGGER "t_kemasanFormulaFix_upd"
    AFTER UPDATE ON "t_kemasanFormulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanFormulaFix_hist();
CREATE OR REPLACE TRIGGER "t_kemasanFormulaFix_del"
    AFTER DELETE ON "t_kemasanFormulaFix"
    FOR EACH ROW EXECUTE FUNCTION process_t_kemasanFormulaFix_hist();

      -- T_FORMULA FIX PROSES PENGOLAHAN
   
CREATE OR REPLACE FUNCTION process_t_formulaFix_prosesPengolahan_hist() RETURNS TRIGGER AS $t_formulaFix_prosesPengolahan_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formulaFix_prosesPengolahan_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formulaFix_prosesPengolahan_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formulaFix_prosesPengolahan_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formulaFix_prosesPengolahan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaFix_prosesPengolahan_ins"
    AFTER INSERT ON "t_formulaFix_prosesPengolahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_prosesPengolahan_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_prosesPengolahan_upd"
    AFTER UPDATE ON "t_formulaFix_prosesPengolahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_prosesPengolahan_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_prosesPengolahan_del"
    AFTER DELETE ON "t_formulaFix_prosesPengolahan"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_prosesPengolahan_hist();

      -- T_FORMULA FIX PROSES PENGEMASAN
   
CREATE OR REPLACE FUNCTION process_t_formulaFix_prosesPengemasan_hist() RETURNS TRIGGER AS $t_formulaFix_prosesPengemasan_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formulaFix_prosesPengemasan_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formulaFix_prosesPengemasan_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formulaFix_prosesPengemasan_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formulaFix_prosesPengemasan_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaFix_prosesPengemasan_ins"
    AFTER INSERT ON "t_formulaFix_prosesPengemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_prosesPengemasan_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_prosesPengemasan_upd"
    AFTER UPDATE ON "t_formulaFix_prosesPengemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_prosesPengemasan_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_prosesPengemasan_del"
    AFTER DELETE ON "t_formulaFix_prosesPengemasan"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_prosesPengemasan_hist();

      -- T_FORMULA FIX Rancangan spesifikasi obat jadi
   
CREATE OR REPLACE FUNCTION process_t_formulaFix_rancanganSpesifikasiObatJadi_hist() RETURNS TRIGGER AS $t_formulaFix_rancanganSpesifikasiObatJadi_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formulaFix_rancanganSpesifikasiObatJadi_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formulaFix_rancanganSpesifikasiObatJadi_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formulaFix_rancanganSpesifikasiObatJadi_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formulaFix_rancanganSpesifikasiObatJadi_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaFix_rancanganSpesifikasiObatJadi_ins"
    AFTER INSERT ON "t_formulaFix_rancanganSpesifikasiObatJadi"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_rancanganSpesifikasiObatJadi_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_rancanganSpesifikasiObatJadi_upd"
    AFTER UPDATE ON "t_formulaFix_rancanganSpesifikasiObatJadi"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_rancanganSpesifikasiObatJadi_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_rancanganSpesifikasiObatJadi_del"
    AFTER DELETE ON "t_formulaFix_rancanganSpesifikasiObatJadi"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_rancanganSpesifikasiObatJadi_hist();

      -- T_FORMULA FIX data stablitias
CREATE OR REPLACE FUNCTION process_t_formulaFix_dataStabilitas_hist() RETURNS TRIGGER AS $t_formulaFix_dataStabilitas_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formulaFix_dataStabilitas_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formulaFix_dataStabilitas_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formulaFix_dataStabilitas_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formulaFix_dataStabilitas_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaFix_dataStabilitas_ins"
    AFTER INSERT ON "t_formulaFix_dataStabilitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_dataStabilitas_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_dataStabilitas_upd"
    AFTER UPDATE ON "t_formulaFix_dataStabilitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_dataStabilitas_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_dataStabilitas_del"
    AFTER DELETE ON "t_formulaFix_dataStabilitas"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_dataStabilitas_hist();

      -- T_FORMULA FIX acuan Catatan trial
CREATE OR REPLACE FUNCTION process_t_formulaFix_acuanCatatanTrial_hist() RETURNS TRIGGER AS $t_formulaFix_acuanCatatanTrial_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_formulaFix_acuanCatatanTrial_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_formulaFix_acuanCatatanTrial_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_formulaFix_acuanCatatanTrial_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_formulaFix_acuanCatatanTrial_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_formulaFix_acuanCatatanTrial_ins"
    AFTER INSERT ON "t_formulaFix_acuanCatatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_acuanCatatanTrial_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_acuanCatatanTrial_upd"
    AFTER UPDATE ON "t_formulaFix_acuanCatatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_acuanCatatanTrial_hist();
CREATE OR REPLACE TRIGGER "t_formulaFix_acuanCatatanTrial_del"
    AFTER DELETE ON "t_formulaFix_acuanCatatanTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_formulaFix_acuanCatatanTrial_hist();