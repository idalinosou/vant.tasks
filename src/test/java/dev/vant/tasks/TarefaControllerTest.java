package dev.vant.tasks;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TarefaControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    private String corpo(String titulo, String descricao, String prioridade, LocalDate prazo) throws Exception {
        return json.writeValueAsString(new Pedido(titulo, descricao, prioridade, prazo));
    }

    private long criarTarefa(String titulo, String prioridade) throws Exception {
        MvcResult resultado = mvc.perform(post("/api/tarefas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo(titulo, "Descrição de teste", prioridade, LocalDate.now().plusDays(3))))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(resultado.getResponse().getContentAsString()).get("id").asLong();
    }

    private record Pedido(String titulo, String descricao, String prioridade, LocalDate prazo) {
    }

    @Test
    void criaTarefaComStatusPendenteEPrioridadePadrao() throws Exception {
        mvc.perform(post("/api/tarefas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Estudar Spring", "Revisar JPA", null, LocalDate.now().plusDays(1))))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.titulo").value("Estudar Spring"))
                .andExpect(jsonPath("$.prioridade").value("MEDIA"))
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.criadaEm").isNotEmpty())
                .andExpect(jsonPath("$.concluidaEm").value(nullValue()));
    }

    @Test
    void rejeitaTituloEmBrancoComMapaDeCampos() throws Exception {
        mvc.perform(post("/api/tarefas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("   ", null, "ALTA", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.caminho").value("/api/tarefas"))
                .andExpect(jsonPath("$.campos.titulo").isNotEmpty());
    }

    @Test
    void rejeitaPrazoNoPassado() throws Exception {
        mvc.perform(post("/api/tarefas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Tarefa atrasada", null, "BAIXA", LocalDate.now().minusDays(1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.prazo").isNotEmpty());
    }

    @Test
    void buscaTarefaPorId() throws Exception {
        long id = criarTarefa("Ler documentação", "ALTA");

        mvc.perform(get("/api/tarefas/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.prioridade").value("ALTA"));
    }

    @Test
    void retorna404QuandoTarefaNaoExiste() throws Exception {
        mvc.perform(get("/api/tarefas/{id}", 9999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.erro").isNotEmpty());
    }

    @Test
    void concluiTarefaEPreencheDataDeConclusao() throws Exception {
        long id = criarTarefa("Enviar portfólio", "MEDIA");

        mvc.perform(patch("/api/tarefas/{id}/concluir", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDA"))
                .andExpect(jsonPath("$.concluidaEm").isNotEmpty());

        mvc.perform(patch("/api/tarefas/{id}/concluir", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDA"));
    }

    @Test
    void listaTarefasFiltrandoPorStatus() throws Exception {
        long pendente = criarTarefa("Pendente um", "BAIXA");
        long concluida = criarTarefa("Concluída um", "ALTA");
        mvc.perform(patch("/api/tarefas/{id}/concluir", concluida)).andExpect(status().isOk());

        MvcResult resultado = mvc.perform(get("/api/tarefas").param("status", "CONCLUIDA"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode pagina = json.readTree(resultado.getResponse().getContentAsString());
        assertThat(pagina.get("totalElements").asLong()).isEqualTo(1);
        assertThat(pagina.get("content").get(0).get("id").asLong()).isEqualTo(concluida);
        assertThat(pagina.get("content").get(0).get("id").asLong()).isNotEqualTo(pendente);
    }

    @Test
    void paginaResultadosRespeitandoTamanho() throws Exception {
        criarTarefa("Primeira", "BAIXA");
        criarTarefa("Segunda", "MEDIA");
        criarTarefa("Terceira", "ALTA");

        mvc.perform(get("/api/tarefas").param("size", "2").param("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void atualizaTarefaComPut() throws Exception {
        long id = criarTarefa("Nome antigo", "BAIXA");

        mvc.perform(put("/api/tarefas/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Nome novo", "Nova descrição", "ALTA", LocalDate.now().plusDays(7))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titulo").value("Nome novo"))
                .andExpect(jsonPath("$.descricao").value("Nova descrição"))
                .andExpect(jsonPath("$.prioridade").value("ALTA"));
    }

    @Test
    void impedeEditarTarefaConcluida() throws Exception {
        long id = criarTarefa("Já feita", "MEDIA");
        mvc.perform(patch("/api/tarefas/{id}/concluir", id)).andExpect(status().isOk());

        mvc.perform(put("/api/tarefas/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Tentativa de edição", null, "ALTA", null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void excluiTarefaERetorna404Depois() throws Exception {
        long id = criarTarefa("Será removida", "MEDIA");

        mvc.perform(delete("/api/tarefas/{id}", id))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/tarefas/{id}", id))
                .andExpect(status().isNotFound());
    }
}
